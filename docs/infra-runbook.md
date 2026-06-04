
# Infrastructure Runbook — DV Hub

> Операционный мануал для re-search.wiki. Источник истины по серверу.
> Обновляется при каждом изменении инфраструктуры. Заполняется по ходу выполнения DV-006a → DV-027.
> Никаких секретов в этом файле — только ссылки на хранилище ключей.

**Status**: 🚧 в процессе — DV-006a выполнено, остальные разделы заполняются по мере выполнения DV-008..DV-027.

---

## 1. Архитектура и адреса

### Домены

| Домен | Назначение | Status |
|---|---|---|
| `re-search.wiki` | Основной сайт dv-hub | TODO (DV-005) |
| `www.re-search.wiki` | Redirect → re-search.wiki | TODO |
| `meet.re-search.wiki` | MiroTalk SFU (видеосвязь) | TODO (DV-011) |
| `drive.re-search.wiki` | Twake Drive (Phase 2) | LATER |

### Сервер

- **Провайдер**: Fornex
- **Тариф**: 2 vCPU / 4 GB RAM / 40 GB NVMe Fast (CPU 3.0 GHz min)
- **Регион**: Germany
- **OS**: Ubuntu 24.04 LTS
- **IP**: TODO (заполнить после DV-006)
- **Hostname**: `dv-hub.host` (предложение)

### Сетевая схема

```mermaid
flowchart LR
    U1([re-search.wiki]) --> N1[Nginx :443]
    N1 --> H[dv-hub Node :8787]
    H --> DB[(SQLite файл)]
    U2([meet.re-search.wiki]) --> N2[Nginx :443]
    N2 --> M[MiroTalk SFU :3010]
    M --> Media[[media :40000-40100 UDP]]
```

### Порты

| Порт | Протокол | Назначение | Открыт наружу |
|---|---|---|---|
| 20108 | TCP | SSH (нестандартный) | да (key-only) |
| 80 | TCP | HTTP → 301 на HTTPS | да |
| 443 | TCP | HTTPS (Nginx) | да |
| 3010 | TCP | MiroTalk SFU (за Nginx) | нет |
| 8787 | TCP | dv-hub Node (за Nginx) | нет |
| 40000-40100 | TCP+UDP | MiroTalk media | да |

### Контакты

- Поддержка Fornex: панель https://ru.fornex.com (тикеты в панели управления)
- Поддержка Namecheap (домен): https://www.namecheap.com/support/
- Owner: Max (msivyhin@gmail.com)

---

## 2. Доступ

### SSH

- Пользователь: `dv` (не root)
- Аутентификация: только ключ, парольный вход отключён
- Порт: 20108 (нестандартный, стандартный 22 закрыт)
- Команда: `ssh -p 20108 dv@re-search.wiki`
- Ключи: см. `DV/Site/keys-passwords.mdenc` (зашифрованный файл в волте, не в репо)

### Кто имеет доступ

TODO: список после раздачи ключей.

### Восстановление доступа

Если потерял ключ:

1. Войти в панель Fornex https://ru.fornex.com/
2. Использовать VNC console для доступа к серверу
3. Добавить новый публичный ключ в `~/.ssh/authorized_keys`

---

## 3. Развёртывание с нуля

> Используется при пересоздании сервера или подъёме staging.
> Команды копируются сюда **по факту выполнения** во время DV-006a..DV-027.

### 3.1 Базовая настройка сервера (DV-006a) — ВЫПОЛНЕНО

> **Контекст**: Первоначальная настройка Ubuntu 24.04 LTS на Fornex VPS (Germany).
> **Цель**: Создать безопасную базовую среду для продакшен-нагрузки.

```bash
# === ЭТАП 1: Первоначальное подключение (от root) ===

# Подключиться как root (пароль из панели Fornex)
# Зачем: root нужен для первоначальной настройки, потом будем работать от пользователя dv
ssh root@<IP-адрес-сервера>

# Обновить списки пакетов
# Зачем: чтобы установить последние версии пакетов с исправлениями безопасности
apt update

# Обновить все установленные пакеты
# Зачем: применить security patches и bug fixes
apt upgrade -y

# Установить базовые утилиты
# Зачем: curl/wget для скачивания, git для кода, nano для редактирования конфигов, htop для мониторинга
apt install -y curl wget git nano htop

# Установить hostname
# Зачем: dv-hub.host — понятное имя сервера для логов и мониторинга
hostnamectl set-hostname dv-hub.host

# Установить timezone (Москва)
# Зачем: все логи и timestamps в БД должны быть в одном часовом поясе (МСК для русскоязычной аудитории)
timedatectl set-timezone Europe/Moscow

# === ЭТАП 2: Создание пользователя dv ===

# Создать пользователя dv с домашней директорией
# Зачем: не работать от root — это опасно. dv = "discussion evenings"
adduser dv

# Добавить в группу sudo
# Зачем: чтобы dv мог выполнять команды с правами root через sudo
usermod -aG sudo dv

# Переключиться на пользователя dv
su - dv

# Создать директорию для SSH-ключей
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Создать файл authorized_keys и вставить публичный ключ
# Зачем: вход по ключу безопаснее пароля (нельзя подобрать брутфорсом)
nano ~/.ssh/authorized_keys
# Вставить содержимое ~/.ssh/id_rsa.pub с локальной машины
chmod 600 ~/.ssh/authorized_keys

# Вернуться к root
exit

# === ЭТАП 3: Hardening SSH ===

# Открыть конфиг SSH
nano /etc/ssh/sshd_config

# Изменить параметры:
# Port 20108                    # Нестандартный порт — снижает количество автоматических атак
# PermitRootLogin no            # Запретить вход root по SSH
# PasswordAuthentication no     # Только ключи, никаких паролей
# PubkeyAuthentication yes      # Включить аутентификацию по ключу
# MaxAuthTries 3                # Максимум 3 попытки ввода пароля

# Проверить конфигурацию (не должно быть ошибок)
sshd -t

# Перезапустить SSH
systemctl restart ssh

# ВАЖНО: Открыть НОВЫЙ терминал и проверить вход:
# ssh -p 20108 dv@<IP-адрес>
# Если работает — закрыть старую сессию. Если нет — исправить конфиг!

# === ЭТАП 4: Firewall (UFW) ===

# Установить ufw
apt install -y ufw

# Политики по умолчанию: блокировать входящие, разрешить исходящие
ufw default deny incoming
ufw default allow outgoing

# Открыть SSH (нестандартный порт)
ufw allow 20108/tcp comment 'SSH (custom port)'

# Открыть HTTP (для редиректа на HTTPS и certbot)
ufw allow 80/tcp comment 'HTTP'

# Открыть HTTPS
ufw allow 443/tcp comment 'HTTPS'

# Открыть MiroTalk SFU (веб-интерфейс)
ufw allow 3010/tcp comment 'MiroTalk SFU'

# Открыть MiroTalk media (WebRTC) — диапазон портов для видео/аудио потоков
ufw allow 40000:40100/tcp comment 'MiroTalk media TCP'
ufw allow 40000:40100/udp comment 'MiroTalk media UDP'

# Включить firewall
# Зачем: блокирует все порты кроме разрешённых — защита от сканирования
ufw enable

# Проверить статус
ufw status verbose

# === ЭТАП 5: Fail2ban ===

# Установить fail2ban
# Зачем: автоматически банит IP после 3 неудачных попыток входа — защита от брутфорса
apt install -y fail2ban

# Создать локальный конфиг
nano /etc/fail2ban/jail.local

# Содержимое jail.local:
# [DEFAULT]
# bantime = 1h          # Бан на 1 час
# findtime = 10m        # Окно для подсчёта попыток
# maxretry = 3          # Максимум 3 попытки
# backend = systemd
#
# [sshd]
# enabled = true
# port = ssh
# filter = sshd
# logpath = /var/log/auth.log
# maxretry = 3
# bantime = 1h

# Перезапустить fail2ban
systemctl restart fail2ban
systemctl enable fail2ban

# Проверить статус
systemctl status fail2ban
fail2ban-client status sshd
```

**Примечания:**
- Swap НЕ создавался — при необходимости проще расширить RAM через панель Fornex
- Timezone: Europe/Moscow (не Berlin) — платформа ориентирована на МСК
- SSH порт: 20108 (нестандартный) — снижает шум от ботов

### 3.2 Установка стека (DV-006a) — ВЫПОЛНЕНО

> **Контекст**: Установка Node.js, PM2, Nginx, certbot и других зависимостей.

```bash
# === Базовые пакеты ===

# Установить всё необходимое
# Зачем: build-essential для компиляции npm-пакетов, nginx как reverse proxy, ffmpeg для обработки медиа
apt install -y \
  build-essential \
  git \
  curl \
  wget \
  unzip \
  nginx \
  snapd \
  ffmpeg \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release

# === Certbot (Let's Encrypt) ===

# Установить snap core
snap install core
snap refresh core

# Установить certbot через snap
# Зачем snap: официальная рекомендация Let's Encrypt, всегда актуальная версия
snap install --classic certbot

# Создать symlink для удобства
ln -s /snap/bin/certbot /usr/bin/certbot

# Проверить версию
certbot --version

# === Node.js через nvm (от пользователя dv) ===

# Переключиться на dv
su - dv

# Скачать и установить nvm
# Зачем nvm: позволяет легко переключаться между версиями Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Перезагрузить shell
source ~/.bashrc

# Установить последнюю LTS версию
# Зачем LTS: стабильная версия с долгосрочной поддержкой
nvm install --lts
nvm use --lts
nvm alias default lts/*

# Проверить версии
node --version
npm --version

# === PM2 ===

# Установить PM2 глобально
# Зачем: process manager для Node.js — автоперезапуск, логи, мониторинг
npm install -g pm2

# Настроить автозапуск PM2 при перезагрузке сервера
pm2 startup
# Скопировать и выполнить команду, которую выведет pm2 startup

# Проверить версию
pm2 --version

# === Nginx ===

# Вернуться к root
exit

# Проверить статус Nginx
systemctl status nginx

# Если не запущен — запустить
systemctl start nginx
systemctl enable nginx

# Создать директории для доменов
mkdir -p /var/www/re-search.wiki
mkdir -p /var/www/meet.re-search.wiki

# Установить владельца (пользователь dv)
chown -R dv:dv /var/www/re-search.wiki
chown -R dv:dv /var/www/meet.re-search.wiki

# Установить права
chmod -R 755 /var/www
```

**Проверка после установки:**
```bash
# От пользователя dv:
node --version    # Должно показать v20.x.x или v22.x.x
npm --version     # Должно показать 10.x.x
pm2 --version     # Должно показать 5.x.x

# От root:
nginx -v          # Должно показать nginx version
certbot --version # Должно показать certbot version
systemctl status nginx  # Должно быть active (running)
```

### 3.3 Деплой dv-hub (DV-008) — TODO

```bash
# git clone, npm ci, npm run build, pm2 start ecosystem.config.cjs
```

### 3.4 Деплой MiroTalk SFU (DV-011) — TODO

```bash
# git clone mirotalksfu, env, pm2 start
```

### 3.5 Nginx + SSL (DV-027) — TODO

```bash
# server blocks для трёх хостов, certbot --nginx
```

---

## 4. Обновления и rollback

### Обновление dv-hub

```bash
cd /opt/dv-hub
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart dvhub
pm2 logs dvhub --lines 50
```

### Обновление MiroTalk SFU

```bash
cd /opt/mirotalksfu
git pull
npm ci
pm2 restart mirotalksfu
```

### Rollback dv-hub

```bash
cd /opt/dv-hub
git log --oneline -10
git checkout <sha>
npm ci --omit=dev && npm run build
pm2 restart dvhub
```

При откате после миграции БД — сначала откатить миграцию (см. раздел 6), потом код.

---

## 5. Мониторинг и логи

### Быстрая проверка здоровья

```bash
pm2 status
pm2 logs --lines 30
df -h
free -m
systemctl status nginx
ufw status
curl -I https://re-search.wiki
```

### Логи

| Что | Где | Команда |
|---|---|---|
| dv-hub | `~/.pm2/logs/dvhub-*.log` | `pm2 logs dvhub` |
| MiroTalk | `~/.pm2/logs/mirotalksfu-*.log` | `pm2 logs mirotalksfu` |
| Nginx access | `/var/log/nginx/access.log` | `tail -f /var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` | `tail -f /var/log/nginx/error.log` |
| System | journalctl | `journalctl -u nginx -f` |
| Auth | `/var/log/auth.log` | `sudo tail -f /var/log/auth.log` |

### Алёрты

Пока нет (см. ADR-001). При появлении — Uptime Kuma как отдельный сервис.

---

## 6. Бэкапы и восстановление

### Что бэкапим

- SQLite файл: `/opt/dv-hub/data/dv-hub.db`
- `.env` файлы: `/opt/dv-hub/.env`, `/opt/mirotalksfu/.env`
- Nginx конфиги: `/etc/nginx/sites-available/`
- Загрузки: `/opt/dv-hub/uploads/` (до Twake Drive)

### Метод

TODO (DV-009): rsync на внешнее хранилище.
Временный вариант на этапе MVP — ручной `tar` раз в неделю на локальный ноут.

### Расписание

TODO: cron-задача после DV-009.

### Восстановление

TODO: проверить как минимум один раз, что бэкап разворачивается.

---

## 7. Troubleshooting

### Сайт не открывается

```bash
pm2 status
systemctl status nginx
curl -I http://localhost:8787
sudo nginx -t
df -h
```

### Видео не работает (MiroTalk)

1. Проверить порты: `sudo ufw status | grep 40000`
2. Логи: `pm2 logs mirotalksfu --lines 100`
3. Если пользователь за симметричным NAT — нужен TURN (ADR-007, DV-012)
4. Проверить `SFU_ANNOUNCED_IP` в `.env` равен публичному IP

### SSL сертификат истекает / истёк

```bash
sudo certbot certificates
sudo certbot renew --dry-run
sudo certbot renew
sudo systemctl reload nginx
```

Автообновление через systemd timer должно работать, проверь: `systemctl status certbot.timer`.

### Диск переполнен

```bash
du -sh /var/log/* | sort -h
du -sh /opt/*
pm2 flush
journalctl --vacuum-time=7d
```

### Высокая память (5 GB впритык при созвоне)

Это известное ограничение (ADR-002). Решения по эскалации:

1. Уменьшить количество одновременных участников комнаты
2. Перейти на тариф с 8 GB RAM у Fornex (настраиваемый тариф)
3. Вынести MiroTalk на отдельный сервер

### Не пускает по SSH

Использовать VNC console в панели Fornex, проверить:

```bash
sudo tail -50 /var/log/auth.log
sudo systemctl status ssh
sudo ufw status
```

---

## 8. Регулярное обслуживание

### Еженедельно (понедельник, 15 мин)

```bash
ssh dv@re-search.wiki
sudo apt update && sudo apt upgrade -y
sudo certbot renew --dry-run
pm2 flush
df -h
pm2 status
```

### Ежемесячно (30 мин)

- Проверить что последний бэкап разворачивается (после DV-009)
- Audit ufw rules: `sudo ufw status numbered`
- Проверить fail2ban: `sudo fail2ban-client status sshd`
- Обновить этот runbook если что-то менялось

### Ежеквартально

- Ротация SSH-ключей (если в команде кто-то ушёл)
- Ротация `GITHUB_TOKEN` (если используется на сервере)
- Проверить актуальность ADR в `docs/architecture.md` vs реальный сервер

---

## Журнал изменений

| Дата | Что | Кто |
|---|---|---|
| 2026-05-25 | Создан скелет (DV-029) | Max |
| 2026-06-04 | DV-006a: базовая настройка сервера (SSH hardening, ufw, fail2ban, стек) | Max |


function renderFAQ() {
  app().innerHTML = `
  <div class="fade-in max-w-3xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6"><i class="fas fa-question-circle mr-2 text-accent-500"></i>Что такое DV Hub?</h1>
    
    <div class="space-y-4">

      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-medium text-lg mb-2">Зачем это нужно?</h3>
        <p class="text-sm text-ink-600 leading-relaxed">DV Hub — платформа для организации <strong>дискуссионных вечеров</strong>. Мы собираемся, выбираем тему, готовим материалы, проводим обсуждение и фиксируем результаты. Всё в одном месте: от идеи до синтеза.</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-medium text-lg mb-2">Как устроен процесс?</h3>
        <p class="text-sm text-ink-600 leading-relaxed"><strong>Материалы</strong> → кто-то находит статью, видео, подкаст и добавляет в систему.<br>
        <strong>Темы</strong> → из материалов формируются темы для обсуждения. Тема проходит стадии: предложена → созревает → назначена → обсуждается → синтез готов.<br>
        <strong>Дискуссии</strong> → создаётся комната с датой и временем. Участники подключаются через Jitsi-звонок прямо на сайте. Есть чат, заметки, задачи.<br>
        <strong>Медиа</strong> → результаты могут быть оформлены как публикации (YouTube, подкаст, статья).</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-medium text-lg mb-2">Роли</h3>
        <p class="text-sm text-ink-600 leading-relaxed"><strong>Гость</strong> — может смотреть материалы и темы, предлагать идеи.<br>
        <strong>Исследователь</strong> — добавляет материалы, участвует в дискуссиях, пишет в чат.<br>
        <strong>Эксперт</strong> — приглашённый специалист по теме.<br>
        <strong>Модератор</strong> — управляет темами, комнатами, участниками.<br>
        <strong>Админ</strong> — полный доступ к системе.</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-medium text-lg mb-2">Как начать?</h3>
        <p class="text-sm text-ink-600 leading-relaxed">1. Войдите через Telegram или email (кнопка «Войти» в правом верхнем углу).<br>
        2. Посмотрите раздел <a href="/materials" class="text-accent-500 hover:underline">Материалы</a> — что уже собрано.<br>
        3. Загляните в <a href="/topics" class="text-accent-500 hover:underline">Темы</a> — какие обсуждения готовятся.<br>
        4. Присоединитесь к <a href="/rooms" class="text-accent-500 hover:underline">Дискуссии</a> — выберите комнату и нажмите «Участвовать».</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-medium text-lg mb-2">Есть идея для обсуждения?</h3>
        <p class="text-sm text-ink-600 leading-relaxed">Даже без регистрации можно отправить идею через форму на <a href="/" class="text-accent-500 hover:underline">дашборде</a> (блок «Предложить идею» внизу страницы). Модераторы рассмотрят и добавят в темы.</p>
      </div>

    </div>
  </div>`
}

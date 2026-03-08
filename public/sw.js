self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    var data = event.data.json();
    var options = {
      body: data.message || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.type || 'notification',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'STRAVON', options)
    );
  } catch (e) {
    // fallback for non-JSON
    event.waitUntil(
      self.registration.showNotification('STRAVON', {
        body: event.data.text(),
        icon: '/icon-192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

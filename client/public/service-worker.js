const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {any} */ (self));

// If the service worker was updated, switch to the updated version immediately.
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
sw.addEventListener("install", () => {
  sw.skipWaiting();
});

// Give service worker control without requiring reload.
// https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
sw.addEventListener("activate", e => {
  e.waitUntil(sw.clients.claim());
});

sw.addEventListener("push", e => {
  if (e.data === null) {
    console.error("Received push message with null data.");
  } else {
    const { title, body } = e.data.json();
    e.waitUntil(sw.registration.showNotification(
      title,
      {
        body: body ?? undefined,
        icon: "/git_knowledgetree-icon.svg",
        badge: "/git_knowledgetree-icon.svg",
      },
    ));
  }

  // e.waitUntil((async () => {
  //   const subscription = await sw.registration.pushManager.getSubscription();
  //   await fetch("/api/notifications/test-response", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify(subscription),
  //   });
  // })());
});

// Open dashboard page when notification is clicked.
// https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow#opening_a_window_on_a_notification_click
sw.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    (async () => {
      // Service workers provide service to clients. Clients can be "window clients" or other
      // workers. Window clients are instances of our site, like browser tabs or apps that have
      // been installed onto the user's desktop or mobile device. Here we check to see if we can
      // reuse an existing window client instead of opening a new one.
      const clients = await sw.clients.matchAll({
        type: "window",

        // Include clients running a different version of this service worker.
        includeUncontrolled: true,
      });

      for (const client of clients) {
        const url = new URL(client.url);

        if (url.pathname === "/dashboard") {
          // A window client that is already on the dashboard page - open it.
          client.focus();
          return;
        }
      }

      // No suitable window client found - open a new one.
      await sw.clients.openWindow("/dashboard");
    })(),
  );
});
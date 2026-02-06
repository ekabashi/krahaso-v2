export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    if (!response.headers) {
      response.headers = {}
    }

    response.headers['Vary'] = 'host, x-forwarded-host'
    response.headers['Cache-Control'] = 'no-store'
  })
})

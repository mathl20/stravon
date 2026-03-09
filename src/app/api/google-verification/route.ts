export function GET() {
  return new Response('google-site-verification: googleeb54faa67b448e6b.html', {
    headers: { 'Content-Type': 'text/html' },
  });
}

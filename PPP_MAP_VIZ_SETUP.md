This is an isolated copy of the visualization project.

It is intended for work inside `ppp_map` without modifying the original `WEB` folder.

Defaults in this copy:
- Web app: `http://localhost:5174`
- Mock visualization API: `http://127.0.0.1:3947`

Run:

```bash
npm install
npm run dev
```

Override ports if needed:

```bash
PAIN_WEB_PORT=5180 PAIN_API_PORT=3950 npm run dev
```

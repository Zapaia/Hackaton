# Mooneto — handoff para el próximo agente

Última actualización: 2026-08-29

Este documento resume el estado real del producto y las decisiones tomadas en la sesión. Leerlo junto con `docs/STATE.md` y `docs/ROADMAP.md` antes de modificar código.

## Qué es el producto

Mooneto es un agente de investigación de derecho espacial. El usuario hace una pregunta en lenguaje natural; el backend la interpreta, consulta Cala, contrasta los claims contra provisiones legales persistentes y devuelve un veredicto. La interfaz convierte ese expediente en una pieza visual: la Luna es el centro, el cohete visita cada instrumento recuperado y luego se muestran la evidencia y las posturas jurisdiccionales.

Principio de autoridad: los blogs y el comentario de Cala no son evidencia legal. Un claim solo puede ser `settled` o `disputed` si cita una provisión estructurada del corpus. Los claims sin provisión quedan `unsupported`.

## Estado implementado

### Corpus y recuperación

- `scripts/corpus.ts` hace la carga única, secuencial y pausada de los seis instrumentos de `CORE`.
- `data/corpus.json` es el corpus versionado que se usa en runtime; así no se vuelven a pedir los seis instrumentos a Cala en cada request.
- `lib/mooneto/laws.ts` lee el corpus local y solo consulta/cachea leyes adicionales que Cala nombre en una pregunta.
- Cala expuso provisiones estructuradas para Outer Space Treaty (1967), Moon Agreement (1979) y Artemis Accords (2020). Rescue, Liability y Registration se escanearon, pero no se inventaron provisiones cuando Cala no devolvió `key_provisions`.

### Preguntas libres

- `lib/mooneto/rewrite.ts` usa OpenAI para convertir cada pregunta en una pregunta autónoma y precisa de derecho espacial, incluso cuando no hay historial.
- No hay un mapa hardcodeado de frases como `mine in the Moon`; la semántica se interpreta antes de consultar Cala.
- `app/api/ask/route.ts` descarta respuestas cacheadas sin instrumentos y las vuelve a consultar, evitando que un resultado viejo de `0 instruments` contamine la demo.
- Las leyes visibles se derivan de las entidades que devuelve Cala y de las provisiones realmente citadas.

### Evidencia y UI

- `lib/mooneto/classify.ts` fuerza `unsupported` cuando no existe una provisión citable.
- `app/page.tsx` ya no renderiza enlaces a blogs en `sources`.
- El resultado muestra primero el veredicto y luego, debajo del recorrido, dos paneles:
  - **Treaty evidence:** instrumento, año, cantidad de claims grounded, estado de provisión y texto exacto de la provisión.
  - **Jurisdiction positions:** países agrupados en Supports / Rejects / Unclear, con bandera, postura y explicación `why` visible.
- La pregunta permanece en una bubble inline arriba a la izquierda; el reporte está en el flujo normal debajo, sin ventana superpuesta. La visual orbital es la protagonista.
- `app/globals.css` usa únicamente los tokens existentes y añade responsive/reduced-motion para estos paneles.

### Visual y Fal

- Durante `exploring`, `app/page.tsx` usa `public/illustrations/lunar-mining-h3-cartoon.mp4` cuando la consulta se reconoce como minería/extracción; el video es silencioso, autoplay, loop y tiene fallback a la constelación CSS si falla.
- El modelo es `minimax/h3-max/text-to-video` mediante `@fal-ai/client` en `lib/mooneto/fal.ts`.
- El helper limita la duración a 5–15 segundos: el endpoint rechazó una prueba de 3 s con HTTP 422. El clip existente fue generado con una única llamada de 5 s a 480p.
- Fal aporta atmósfera/movimiento; nunca debe llevar nombres, banderas, texto ni hechos legales. Esos datos deben seguir siendo HTML real derivado de Cala.
- La constelación CSS crea posiciones separadas de forma determinista por pregunta, evita la Luna y conecta Moon → treaty star → Moon → siguiente star. El cohete es SVG y la ruta es suave.

## Verificaciones ya realizadas

- La pregunta requerida `Can I own a plot of land on the Moon?` devolvió un conteo settled distinto de cero y una claim citando explícitamente `Moon Agreement · 1979`.
- La pregunta libre `is it possible to mine in the moon?` se reformuló como `Is it possible to mine on the Moon under current space law?`, Cala devolvió cinco instrumentos y el resultado dejó de ser el cache viejo de `0 instruments`.
- `pnpm build` pasó después de los cambios de backend y UI.
- `git diff --check` pasó en la última pasada.

## Checkpoints y commits importantes

Entire registra cada commit como checkpoint. La rama `main` quedó publicada en `origin`.

- `66e86de` — corpus legal persistente para evitar rate limits en runtime.
- `9e110f9` — provisiones legales en la evidencia, sin blogs.
- `5ddbaef` — primera ilustración Fal de minería lunar.
- `e20802f`, `1a95de6`, `25bda3a`, `2b7123b`, `f6f8be9`, `fa3e03a` — evolución de la escena orbital, ruta y estrellas.
- `877b9e8`, `b74939c`, `69d7480` — prueba/integración de MiniMax H3 Max y límites de duración.
- `a4588ee` — reinicio del recorrido para cada pregunta.
- `7bae094` — interpretación semántica dinámica y reintento de cache vacío.
- `c8c1573` — paneles legibles de tratados y jurisdicciones (último checkpoint antes de este documento).

Después de agregar este documento hay que crear y publicar un checkpoint adicional con un mensaje que explique que se deja handoff persistente para continuar con otro agente.

## Pendientes reales

1. Levantar `pnpm dev` y probar en localhost una pregunta de minería y otra no relacionada; verificar que el video aparezca solo durante `exploring` y que la evidencia/paises cambien con el resultado.
2. Si se sigue mejorando el track visual, reemplazar la detección de minería basada en intención/keywords por una señal de actividad devuelta por el agente, para que la selección del asset sea tan dinámica como la respuesta legal. No hardcodear respuestas.
3. Considerar más assets H3 solo si aportan una actividad distinta; no gastar llamadas innecesarias. Mantener el MP4 actual como fallback barato.
4. Si Entire vuelve a mostrar advertencia de remoto, ejecutar `entire checkpoint list` y `git push origin main`; no asumir que un checkpoint local es visible en la web.

## Restricciones y preferencias del usuario

- No tocar `lib/mooneto/plan.ts` ni el rendering del memo: están terminados y verificados.
- Mantener la interfaz visual como protagonista, con pregunta a la izquierda, respuesta arriba y reporte desplegable/en flujo debajo.
- Mostrar tratados, provisiones, países, banderas y razones con datos reales; no sustituir autoridad por links de blogs.
- Hacer commits pequeños y explicativos; cada commit debe quedar sincronizado en Entire.
- El usuario prefiere instrucciones y handoff en español, pero la UI actual está en inglés.

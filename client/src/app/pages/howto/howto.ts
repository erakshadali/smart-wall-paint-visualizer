import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Nav } from '../../shared/nav';

@Component({
  selector: 'app-howto',
  imports: [RouterLink, Nav],
  template: `
    <app-nav />
    <main>
      <h1>How to use the visualizer</h1>
      <p class="lead">Five steps from a room photo to a finished preview.</p>

      <ol class="steps">
        @for (s of steps; track s.title) {
          <li class="card">
            <h2>{{ s.title }}</h2>
            <p>{{ s.text }}</p>
          </li>
        }
      </ol>

      <section class="card">
        <h2>Keyboard shortcuts</h2>
        <ul class="keys">
          <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> Undo</li>
          <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> Redo</li>
          <li><kbd>Enter</kbd> Finish the polygon you are drawing</li>
          <li><kbd>Esc</kbd> Cancel the polygon you are drawing</li>
          <li><kbd>Delete</kbd> Remove the selected wall</li>
        </ul>
      </section>

      <section class="card">
        <h2>Tips for the best result</h2>
        <ul>
          <li>Use a clear, well-lit photo taken straight on to the wall.</li>
          <li>Only upload photos you own. Photos you do not own may not be used.</li>
          <li>Add a point at every wall corner, and around furniture or windows you want to leave unpainted.</li>
          <li>Colours are a preview. Final results may vary due to lighting, screen calibration and wall texture.</li>
        </ul>
      </section>

      <a class="btn primary start" routerLink="/upload">Start a design</a>
    </main>
  `,
  styles: `
    main { max-width: 760px; margin: 0 auto; padding: 32px 16px 56px; display: flex; flex-direction: column; gap: 16px; }
    h1 { margin: 0; font-size: 30px; }
    .lead { margin: 0 0 8px; color: var(--muted); }
    .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; counter-reset: s; }
    .steps li { counter-increment: s; position: relative; padding-left: 64px; }
    .steps li::before { content: counter(s); position: absolute; left: 20px; top: 22px; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; }
    h2 { font-size: 17px; margin: 0 0 6px; }
    p, li { color: var(--muted); font-size: 14px; margin: 0; }
    ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
    .keys { list-style: none; padding: 0; }
    kbd { background: var(--bg); border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 6px; padding: 1px 6px; font: 12px monospace; color: var(--ink); }
    .start { align-self: flex-start; text-decoration: none; }
  `,
})
export class Howto {
  readonly steps = [
    { title: 'Sign in and upload a photo', text: 'Create an account, then upload a JPG or PNG of your room (large photos are shrunk automatically). Confirm the photo is your own.' },
    { title: 'Select the wall', text: 'Choose the Polygon tool and tap each corner of the wall, then tap Finish. Made a wrong tap? Use Back to remove the last point. Use the Brush to paint over curved or irregular areas.' },
    { title: 'Pick a colour or pattern', text: 'Choose from the colour palette or the Patterns tab. Adjust opacity, finish (matte, satin, glossy) and pattern size.' },
    { title: 'Edit and compare', text: 'Use the Select tool to drag wall points or recolour a wall. Add more walls for dual-tone rooms, and turn on Before / After to compare.' },
    { title: 'Save or download', text: 'Save the design to My designs, duplicate it to try another scheme, or download the painted image as a PNG.' },
  ];
}

// Pantalla de login: un letrero centrado con dos modos, "Entrar" y "Crear cuenta".
// Devuelve una promesa que se resuelve con el token de la sesión.
import { GAME_NAME } from '@juego/shared';
import { signIn, signUp } from '../game/auth';

export function showLoginScreen(): Promise<string> {
  return new Promise((resolve) => {
    const panel = document.createElement('form');
    panel.className = 'win login';
    panel.innerHTML = `
      <div class="win-title"><span></span></div>
      <div class="win-body">
        <p class="login-intro"></p>
        <label>Email <input name="email" type="email" autocomplete="email" required></label>
        <label>Contraseña <input name="password" type="password" autocomplete="current-password" required minlength="6"></label>
        <label class="login-name">Nombre en el juego <input name="name" maxlength="16" minlength="3"></label>
        <p class="login-error hint"></p>
        <div class="row">
          <button class="btn" type="submit"></button>
          <button class="btn btn-small login-switch" type="button"></button>
        </div>
      </div>`;
    document.querySelector('#ui')!.append(panel);

    const q = <T extends Element>(sel: string) => panel.querySelector<T>(sel)!;
    const title = q<HTMLSpanElement>('.win-title span');
    const intro = q<HTMLParagraphElement>('.login-intro');
    const nameRow = q<HTMLLabelElement>('.login-name');
    const nameInput = q<HTMLInputElement>('input[name=name]');
    const errorText = q<HTMLParagraphElement>('.login-error');
    const submit = q<HTMLButtonElement>('button[type=submit]');
    const switcher = q<HTMLButtonElement>('.login-switch');

    let creating = false;
    const render = () => {
      title.textContent = creating ? 'Crear cuenta' : 'Entrar';
      intro.textContent = creating
        ? 'Elige el nombre con el que te verán en el pueblo.'
        : `Bienvenido a ${GAME_NAME}. Entra con tu cuenta para jugar.`;
      nameRow.hidden = !creating;
      nameInput.required = creating;
      submit.textContent = creating ? 'Crear cuenta' : 'Entrar';
      switcher.textContent = creating ? 'Ya tengo cuenta' : 'Crear cuenta nueva';
      errorText.textContent = '';
    };
    render();
    switcher.addEventListener('click', () => {
      creating = !creating;
      render();
    });

    panel.addEventListener('submit', async (e) => {
      e.preventDefault(); // un <form> recargaría la página
      const data = new FormData(panel);
      const email = String(data.get('email'));
      const password = String(data.get('password'));
      submit.disabled = true;
      errorText.textContent = '';
      try {
        const token = creating
          ? await signUp(email, password, String(data.get('name')).trim())
          : await signIn(email, password);
        if (!token) {
          errorText.textContent = 'Cuenta creada. Revisa tu email para confirmarla y luego entra.';
          creating = false;
          render();
          return;
        }
        panel.remove();
        resolve(token);
      } catch (error) {
        errorText.textContent = (error as Error).message;
      } finally {
        submit.disabled = false;
      }
    });
  });
}

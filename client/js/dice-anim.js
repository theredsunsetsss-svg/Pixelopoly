export const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

export async function animateDice(el1, el2, finalFirst, finalSecond, duration = 900) {
  const start = performance.now();
  let last = 0;
  return new Promise((resolve) => {
    function frame(t) {
      if (t - last > 80) {
        el1.textContent = FACES[Math.floor(Math.random()*6)];
        el2.textContent = FACES[Math.floor(Math.random()*6)];
        last = t;
        el1.classList.add('is-rolling');
        el2.classList.add('is-rolling');
      }
      if (t - start < duration) requestAnimationFrame(frame);
      else {
        el1.textContent = FACES[finalFirst-1];
        el2.textContent = FACES[finalSecond-1];
        el1.classList.remove('is-rolling');
        el2.classList.remove('is-rolling');
        el1.classList.add('is-bounce');
        el2.classList.add('is-bounce');
        setTimeout(() => {
          el1.classList.remove('is-bounce');
          el2.classList.remove('is-bounce');
          resolve();
        }, 350);
      }
    }
    requestAnimationFrame(frame);
  });
}
const tracks = [
  '../img/audio/echoes.mp3',
  '../img/audio/heroic.mp3',
  '../img/audio/joyful.mp3',
  '../img/audio/valiant.mp3',
  '../img/audio/wanderlust.mp3'
];

let currentTrackIndex = 0;
const audio = new Audio();
audio.volume = 0.3; 

const isMusicEnabled = () => localStorage.getItem('pixelopoly-music') !== 'false';

function playNextTrack() {
  if (!isMusicEnabled()) return;
  
  audio.src = tracks[currentTrackIndex];
  audio.play().catch(e => {
    console.log("Музыка ожидает клика пользователя...");
  });
  
  audio.onended = () => {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    playNextTrack();
  };
}

function startMusicOnInteraction() {
  if (isMusicEnabled() && audio.paused) {
    playNextTrack();
  }
  document.removeEventListener('click', startMusicOnInteraction);
  document.removeEventListener('keydown', startMusicOnInteraction);
}

document.addEventListener('click', startMusicOnInteraction);
document.addEventListener('keydown', startMusicOnInteraction);

window.toggleMusic = (enabled) => {
  localStorage.setItem('pixelopoly-music', enabled);
  if (enabled) {
    playNextTrack();
  } else {
    audio.pause();
  }
};

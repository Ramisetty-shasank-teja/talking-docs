// Fix for loading PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let fullText = "";
let utterance;
let selectedVoice = null;

document.getElementById("pdfInput").addEventListener("change", handlePDF);

function populateVoices() {
  const voices = speechSynthesis.getVoices();
  const voiceSelect = document.getElementById("voiceSelect");
  voiceSelect.innerHTML = "";

  voices.forEach((voice, index) => {
    const genderLabel = voice.name.toLowerCase().includes("female") || voice.name.toLowerCase().includes("woman") ? " (Female)" :
                        voice.name.toLowerCase().includes("male") || voice.name.toLowerCase().includes("man") ? " (Male)" : "";
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})${genderLabel}`;
    voiceSelect.appendChild(option);
  });

  selectedVoice = voices[0];
}

speechSynthesis.onvoiceschanged = populateVoices;

document.getElementById("voiceSelect").addEventListener("change", () => {
  const voices = speechSynthesis.getVoices();
  selectedVoice = voices[document.getElementById("voiceSelect").value];
});

async function handlePDF(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function () {
    const typedArray = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str).join(" ");
      fullText += strings + "\n\n";
    }

    document.getElementById("textDisplay").textContent = fullText;
  };

  reader.readAsArrayBuffer(file);
}

function startReading() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  utterance = new SpeechSynthesisUtterance(fullText);
  utterance.voice = selectedVoice;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onboundary = function (event) {
    const current = fullText.substring(event.charIndex, event.charIndex + (event.charLength || 1));
    highlightText(current);
  };
  speechSynthesis.speak(utterance);
}

function pauseReading() {
  if (speechSynthesis.speaking) {
    speechSynthesis.pause();
  }
}

function resumeReading() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
  }
}

function restartReading() {
  speechSynthesis.cancel();
  startReading();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(currentWord) {
  const display = document.getElementById("textDisplay");
  if (!currentWord.trim()) return;

  const safeWord = escapeRegExp(currentWord);
  const regex = new RegExp(safeWord, "i");
  const match = fullText.match(regex);
  if (match) {
    const index = match.index;
    const before = fullText.slice(0, index);
    const after = fullText.slice(index + currentWord.length);
    display.innerHTML = `${before}<span style="border:2px solid #00f5a0; padding:2px; border-radius:4px;">${currentWord}</span>${after}`;
  }
}

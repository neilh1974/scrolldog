const scrollButton = document.getElementById("scrollBtn");
const scrollNumber = document.getElementById("scrollNumber");
const dogMood = document.getElementById("dogMood");
const dogWidget = document.getElementById("dogWidget");
const feed = document.querySelector(".feed");

let amount = 0;
const states = ["happy", "worried", "sad", "crying"];
let stateIndex = 0;

function render() {
  const state = states[stateIndex];
  scrollNumber.textContent = amount < 1000 ? `${amount}px` : `${(amount / 1000).toFixed(1)}k`;
  dogMood.textContent = state;
  dogWidget.className = `dogWidget ${state}`;
  feed.style.transform = `translateY(${-Math.min(amount / 60, 170)}px)`;
}

scrollButton.addEventListener("click", () => {
  stateIndex = (stateIndex + 1) % states.length;
  amount = stateIndex === 0 ? 0 : amount + 5200;
  render();
});

render();

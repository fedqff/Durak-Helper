if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("./js/worker.js")
      .then((_res) => console.log("Service worker registered"))
      .catch((err) => console.log("Couldn't to register service worker", err));
  });
}

// Supported card suits
const suits = ["club", "diamond", "spade", "heart"];

// Deck size selection
const deckSelect = document.getElementById("deck-size");
const selectedDeckSpan = document.getElementById("selected-deck-size");

function updateSelectedDeckSpan() {
  selectedDeckSpan.textContent = deckSelect.value;
}
deckSelect.addEventListener("change", updateSelectedDeckSpan);
updateSelectedDeckSpan();

let currentDeckSize = parseInt(deckSelect.value);

function getCardRanks(deckSize) {
  // Колода из 24 карт (от Туза до Девятки)
  if (deckSize === 24) {
    return ["A", "K", "Q", "J", "10", "9"];
  }
  // Full deck, optionally with Jokers
  if (deckSize === 52 || deckSize === 54) {
    return ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  }
  // Standard 36 deck
  return ["A", "K", "Q", "J", "10", "9", "8", "7", "6"];
}

// App state
let undoStack = [];
let redoStack = [];
let currentState = {};

// Render cards from deck
function renderDeck(deckSize) {
  const cardGrid = document.getElementById("card-grid");
  cardGrid.innerHTML = ""; // clear existing

  if (deckSize >= 52) {
    document.body.classList.add("large-deck");
  } else {
    document.body.classList.remove("large-deck");
  }

  const ranks = getCardRanks(deckSize);

  // Create columns for each suit
  suits.forEach((suit) => {
    const column = document.createElement("div");
    column.classList.add("column");

    ranks.forEach((value) => {
      const card = document.createElement("button");
      card.classList.add("card");

      const valueText = document.createElement("span");
      valueText.classList.add(`num-${value.toLowerCase()}`);
      valueText.textContent = value;
      card.appendChild(valueText);

      const svgPath = `assets/${suit}_suit.svg`;
      const suitImg = document.createElement("img");
      suitImg.setAttribute("draggable", "false");
      suitImg.src = svgPath;
      suitImg.alt = `Card suit, ${suit}`;

      card.appendChild(suitImg);

      // Toggle "selected" state if not discarded
      card.addEventListener("click", () => {
        if (!card.classList.contains("card-discarded"))
          card.classList.toggle("card-selected");
      });

      column.appendChild(card);
    });

    cardGrid.appendChild(column);
  });

  const addJokers = deckSize === 54;
  if (addJokers) {
    const jokerRow = document.createElement("div");
    jokerRow.id = "joker-row";

    // Create two joker cards
    for (let i = 1; i <= 2; i++) {
      const jokerCard = document.createElement("button");
      jokerCard.classList.add("card");

      const jokerText = document.createElement("span");
      jokerText.textContent = "Joker";
      jokerText.style.fontSize = "1.2rem";
      if (i === 2) {
        jokerText.classList.add("red");
      }
      jokerCard.appendChild(jokerText);

      jokerCard.addEventListener("click", () => {
        if (!jokerCard.classList.contains("card-discarded"))
          jokerCard.classList.toggle("card-selected");
      });

      jokerRow.appendChild(jokerCard);
    }

    const contentDiv = document.getElementById("content");
    contentDiv.appendChild(jokerRow);
  } else {
    const jokerRow = document.getElementById("joker-row");
    if (jokerRow) {
      jokerRow.remove();
    }
  }

  // Reset undo/redo stacks and current state after re-render
  undoStack = [];
  redoStack = [];
  currentState = {};
  updateButtonStates();
}

// Action buttons
function handleActionButton(buttonId, className) {
  const button = document.getElementById(buttonId + "-action-button");
  button.addEventListener("click", () => handleSelection(className));
}

function handleSelection(className) {
  const allCards = document.querySelectorAll(".card");
  const selectedCards = document.querySelectorAll(".card.card-selected");

  // Save the current state before making changes
  undoStack.push(
    Array.from(allCards).map((card) => {
      return {
        card: card,
        classes: Array.from(card.classList).filter(
          (className) =>
            className.startsWith("card-") && className !== "card-selected",
        ),
      };
    }),
  );

  selectedCards.forEach((card) => {
    card.classList.remove("card-selected");
    if (className != "card-discarded") {
      card.classList.remove("card-owned", "card-enemy", "card-discarded");
    } else if (
      !card.classList.contains("card-owned") &&
      !card.classList.contains("card-enemy")
    ) {
      card.classList.add("card-enemy");
    }
    card.classList.add(className);
    card.disabled = card.classList.contains("card-discarded");
  });

  currentState = Array.from(allCards).map((card) => {
    return {
      card: card,
      classes: Array.from(card.classList).filter(
        (className) =>
          className.startsWith("card-") && className !== "card-selected",
      ),
    };
  });

  // Clear redo stack
  redoStack.length = 0;

  updateButtonStates();
}

handleActionButton("mine", "card-owned");
handleActionButton("enemy", "card-enemy");
handleActionButton("discard", "card-discarded");

// State buttons
const undoButton = document.getElementById("undo-controls-button");
undoButton.disabled = true;

const redoButton = document.getElementById("redo-controls-button");
redoButton.disabled = true;

const resetButton = document.getElementById("reset-controls-button");

function undo() {
  if (undoStack.length > 0) {
    const lastAction = undoStack.pop();
    lastAction.forEach(({ card, classes }) => {
      card.classList.remove(
        "card-selected",
        "card-owned",
        "card-enemy",
        "card-discarded",
      );
      card.classList.add(...classes);
      card.disabled = card.classList.contains("card-discarded");
    });

    redoStack.push(currentState);
    currentState = lastAction;

    updateButtonStates();
  }
}

function redo() {
  if (redoStack.length > 0) {
    const lastAction = redoStack.pop();
    lastAction.forEach(({ card, classes }) => {
      card.classList.remove(
        "card-selected",
        "card-owned",
        "card-enemy",
        "card-discarded",
      );
      card.classList.add(...classes);
      card.disabled = card.classList.contains("card-discarded");
    });

    undoStack.push(currentState);
    currentState = lastAction;

    updateButtonStates();
  }
}

function reset() {
  const allCards = document.querySelectorAll(".card");
  allCards.forEach((card) => {
    card.disabled = false;
    card.classList.remove(
      "card-selected",
      "card-owned",
      "card-enemy",
      "card-discarded",
    );
  });

  // Clear history
  undoStack = [];
  redoStack = [];
  currentState = {};

  updateButtonStates();
}

function updateButtonStates() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
resetButton.addEventListener("click", reset);

function updateFooterBehavior() {
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");
  const content = document.getElementById("content");

  if (!header || !footer || !content) return;

  const viewportHeight = window.innerHeight;
  const headerHeight = header.offsetHeight;
  const footerHeight = footer.offsetHeight;
  const availableSpace = viewportHeight - headerHeight - footerHeight;

  // Get the total height of the content (including any potential overflow)
  const contentHeight = content.scrollHeight;

  if (contentHeight <= availableSpace) {
    document.body.classList.add("short-content");
  } else {
    document.body.classList.remove("short-content");
  }
}

// Window resize listener
window.addEventListener("resize", updateFooterBehavior);

// Deck size change handler
deckSelect.addEventListener("change", (e) => {
  currentDeckSize = parseInt(e.target.value);
  renderDeck(currentDeckSize);
  updateFooterBehavior();
});

renderDeck(currentDeckSize);
updateFooterBehavior();

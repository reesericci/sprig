import { html } from "./libs/uhtml.js";
import { dispatch } from "./dispatch.js";

import { challenges } from "./challenges.js";
import { docs } from "./views/docs.js";
import "./pixel-editor/pixel-editor.js";
import "./sequencer/sequencer.js";
import "./map-editor/map-editor.js";
import "./views/bitmap-preview.js";

export const view = (state) => html`
  ${menu(state)}

  <div class="main-container">
    <div class="code-container">
      <div id="code-editor"></div>
      <div class=${["logs", state.errorInfo ? "erred" : ""].join(" ")}>
        ${state.logs.map(x => html`${x}<br>`)}
      </div>
    </div>
    
    <div class="game-docs-container">
      <div class="game-canvas-container">
        <canvas class="game-canvas"></canvas>
        <canvas class="game-text"></canvas>
      </div>
      <div class="docs">
        ${docs(state)}
      </div>
    </div>

    <div class="vertical-bar"></div>
  </div>

  <div class=${["asset-editor-container", state.editor ? "" : "hide"].join(" ")}  @click=${(event) => {
    // Click on overlay or close button:
    for (const item of event.composedPath()) {
      if (item.classList && item.classList.contains("asset-editor-content")) return;
    }
    dispatch("SET_ASSET_EDITOR", { type: null, text: null })
  }}>
    <button class="close"><ion-icon icon="close" /></button>
    <div class="asset-editor-content">
      ${
        {
          "bitmap": html`<pixel-editor id="asset-editor"></pixel-editor>`,
          "sequencer": html`<sequencer-editor id="asset-editor"></sequencer-editor>`,
          "map": html`<map-editor id="asset-editor"></map-editor>`,
          [undefined]: ""
        }[state.editor]
      }
    </div>
  </div>
`

const sampleMenuItem = sample => html`
  <a class="sample-menu-item" href=${sample.link}>${sample.name}</a>
`

const editableName = (state) => html`
  <div 
    class="menu-item menu-name" 
    contenteditable 
    spellcheck="false"
    @blur=${e => dispatch("SET_NAME", { name: e.target.innerText })}
  >
    ${state.name}
  </div>
`

const drawFile = (file, i, state) => {
  const [ name, text ] = file;
  const setText = () => {
    if (state.stale) return alert("You have unsaved changes! Please save your work before switching files.");
    state.staleRun = true;

    const games = Object.fromEntries(state.savedGames);
    const text = games[name];
    const cur = state.codemirror.state.doc.toString();
    state.newDocument = true;
    dispatch("SET_EDITOR_TEXT", { text: "", range: [0, cur.length] });
    dispatch("RUN");
    state.newDocument = true;
    dispatch("SET_EDITOR_TEXT", { text, range: [0, 0] });
    dispatch("RENDER");
  }

  const deleteFile = () => {
    const toSave = state.savedGames.filter( ([ fileName, text ]) => {
      return fileName !== name;
    })
    window.localStorage.setItem("puzzle-lab", JSON.stringify(toSave) );
   
    if (!confirm(`Do you want to delete: ${name}?`)) return;

    state.savedGames = toSave;
    dispatch("RENDER");
  }

  const fullText = state.codemirror.state.doc.toString();
  const matches = fullText.matchAll(/(map|bitmap|tune)`[\s\S]*?`/g);
  for (const match of matches) {
    const index = match.index;
    state.codemirror.foldRange(index, index+1);
  }
  return html`
    <div style="display: flex; width: 100%;">
      <div style="flex:1;" @click=${setText}>${name.slice(0, 15)}${name.length > 15 ? "..." : ""}</div>
      <div style="margin-left: 10px;" class="delete-file" @click=${deleteFile}>x</div>
    </div>
  `
} 

const newFile = (state) => {
  if (!state.codemirror) return "";

  const setText = () => {
    if (state.stale) return alert("You have unsaved changes! Please save your work before creating a new file.");
    state.staleRun = true;
    
    const text = `/*
@title: game_name
@author: your_name
*/

const player = "p";

setLegend(
  [ player, bitmap\`
................
................
.......000......
.......0.0......
......0..0......
......0...0.0...
....0003.30.0...
....0.0...000...
....0.05550.....
......0...0.....
.....0....0.....
.....0...0......
......000.......
......0.0.......
.....00.00......
................\`]
);

setSolids([]);

let level = 0;
const levels = [
  map\`
p.
..\`,
];

setMap(levels[level]);

setPushables({
  [ player ]: [],
});

onInput("s", () => {
  getFirst(player).y += 1
});

afterInput(() => {
  
});
`;
    const cur = state.codemirror.state.doc.toString();
    state.newDocument = true;
    dispatch("SET_EDITOR_TEXT", { text: "", range: [0, cur.length] });
    dispatch("RUN");
    state.newDocument = true;
    dispatch("SET_EDITOR_TEXT", { text, range: [0, 0] });
    dispatch("RENDER");
  }

  const fullText = state.codemirror.state.doc.toString();
  const matches = fullText.matchAll(/(map|bitmap|tune)`[\s\S]*?`/g);
  for (const match of matches) {
    const index = match.index;
    state.codemirror.foldRange(index, index+1);
  }
  return html`
    <div @click=${setText}>new game</div>
  `
} 

const menu = (state) => html`
  <div class="menu">
    <div class="menu-item dropdown-container">
      ${state.stale ? 'file*' : 'file'}
      <div class="dropdown-list">
        ${newFile(state)}

        <div class="popout-container">
          open recent &rsaquo;
          <div class="popout-list">${state.savedGames.map((file, i) => drawFile(file, i, state))}</div>
        </div>

        <div @click=${() => dispatch("SAVE")}>${state.stale ? 'save*' : 'save'}</div>

        <div class="menu-spacer" />

        <div class="popout-container">
          share &rsaquo;
          <div class="popout-list">
            <div @click=${e => dispatch("SAVE_TO_FILE")}>as file</div>
            <div @click=${e => dispatch("GET_URL")}>
              ${{
                idle: 'as link',
                loading: 'loading...',
                copied: 'copied!'
              }[state.shareLinkState]}
            </div>
          </div>
        </div>
      </div>
    </div>

    <a class="menu-item" href="https://sprig.hackclub.com/gallery">
      explore gallery
    </a>

    <div class="menu-item" @click=${() => dispatch("UPLOAD")}>
      upload to device
    </div>

    <div 
      class=${["menu-item", "run", state.staleRun ? "stale-run" : ""].join(" ")} 
      @click=${() => dispatch("RUN")}>
      <ion-icon name="play" style="margin-right: 6px;" />
      run
    </div>

    <div class="spacer" aria-hidden="true" />

    <div class="menu-item docs-trigger">
      ${docsOpenClosed()} help
    </div>

    <a class="menu-item" href="https://github.com/hackclub/sprig/">
      <ion-icon name="logo-github" />
    </a>
  </div>
`

const drawSample = ({ name, link }) => {
  return html`
    <a href=${link}>
      ${name}
    </a>
  `
}

const learn = () => html`
 <div class="menu-item dropdown-container">
    learn
    <div class="dropdown-list">
      ${challenges.map(({ content, name }, i) => {
        const load = () => {
          const cur = state.codemirror.state.doc.toString();
          const match = cur.match(/@title:\s+([^\n]+)/);
          const curName = (match !== null) ? match[1] : "DRAFT";

          if (curName == name &&
            !confirm(`are you sure you want to overwrite your edited "${name}"?`))
            return;

          state.newDocument = true;
          dispatch("SET_EDITOR_TEXT", {
            text: content.trim(),
            range: [0, cur.length]
          });
        };
        return html`<div @click=${load}>${name}</div>`
      })}
    </div>
  </div>
`


const next = () => html`
  <div @click=${() => {
    const cur = state.codemirror.state.doc.toString();
    const match = cur.match(/@title:\s+([^\n]+)/);
    const curName = (match !== null) ? match[1] : "DRAFT";

    let i = 0;
    for (const { name } of challenges) {
      if (challenges[i+1] && name == curName) {
        state.newDocument = true;
        dispatch("SET_EDITOR_TEXT", {
          text: challenges[i+1].content.trim(),
          range: [0, cur.length]
        });
      }
      i++;
    }
  }} class="next-learn">next</div>
`

function docsOpenClosed() {
  const perc = getComputedStyle(document.documentElement).getPropertyValue("--docs-percentage");
  return perc.trim() === "0%" ? "open" : "close";
}

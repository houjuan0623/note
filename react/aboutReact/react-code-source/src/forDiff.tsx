// @ts-nocheck

import { jsx } from "./react/jsx";
import { ReactElementType } from "@/shared/ReactTypes";
import { useState } from "@/react";

function App() {
  const [arr, setArr] = useState(["one", "two", "three"]);

  function handle_click() {
    setArr(["two", "three", "one"]);
  }

  return (
    <div>
      <h1 onClick={handle_click}>点我改变数组</h1>
      <ul>
        {arr.map((item) => {
          return <li key={item}>{item}</li>;
        })}
      </ul>
    </div>
  );
}

import ReactDom from "@/react-dom";
const root: any = document.querySelector("#root");

// debugger

ReactDom.createRoot(root).render(<App />);

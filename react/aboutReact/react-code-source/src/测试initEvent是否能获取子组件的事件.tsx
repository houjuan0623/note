// @ts-nocheck
import { ReactElementType } from '@/shared/ReactTypes';
import { useState } from '@/react';
function App() {
	const [arr, setArr] = useState(['a', 'b', 'c'])

	function handle_click() {
		debugger
		setArr(['c', 'b', 'a'])
	}
	return (
		<div >
			<div>
				{arr.map((item) => {
					return <h1 key={item}>{item}</h1>
				})}
                <button onClick={handle_click} >点我改变</button>
			</div>
		</div>
	);
}


import ReactDom from '@/react-dom'
const root: any = document.querySelector('#root')

// debugger

ReactDom.createRoot(root).render(<App />)

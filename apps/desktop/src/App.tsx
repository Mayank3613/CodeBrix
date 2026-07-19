import Header from  "./components/layout/Header";
import Toolbar from  "./components/layout/Toolbar";
import Explorer from "./components/layout/Explorer";
import Canvas from "./components/layout/Canvas";
import Panel from "./components/layout/Panel";
import Footer from "./components/layout/Footer";

function App() {

  return (
    <main className="bg-emerald-900 h-screen m-0 flex flex-col gap-2">
      <Header></Header>
      <Toolbar></Toolbar>

      <div className="flex h-[57%] gap-2">
        <Explorer></Explorer>
        <Canvas></Canvas>
        <Panel></Panel>
      </div>

      <Footer ></Footer>

    </main>
  )
}

export default App;

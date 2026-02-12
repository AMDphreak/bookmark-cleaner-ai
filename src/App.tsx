import { Component } from 'solid-js';
import { Router, Routes, Route } from '@solidjs/router';
import MainWindow from './windows/MainWindow';
import ValidationWindow from './windows/ValidationWindow';
import ChatWindow from './windows/ChatWindow';

const App: Component = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" component={MainWindow} />
        <Route path="/validation" component={ValidationWindow} />
        <Route path="/chat" component={ChatWindow} />
      </Routes>
    </Router>
  );
};

export default App;


import React, { Component } from 'react';
import './App.css';
import {
    Route,
    HashRouter
  } from "react-router-dom";
import HomePage from './HomePage'
import MapPage from './MapPage'
import ResponsiveContainer from './ResponsiveContainer'


//entry point, defining routes and enclosing SPA in ResponsiveContainer for mobile vs desktop layouts
class App extends Component {
  constructor(props){
    super();
    this.state = {firstView: true}
  }

  //handles overlay the first time you hit the page, which will show every time you reload.
  //could store a cookie showing if you've visited already, or use it consistently to deliver important messages
  toggleVisibility = () => this.setState({ firstView: !this.state.firstView })

  render() {
    return (
      <HashRouter>
        <ResponsiveContainer>            
          <div>
            <Route exact path="/" render={()=> <HomePage toggleVisibility={this.toggleVisibility} firstView={this.state.firstView}/>}/>
            <Route path="/map" component={MapPage} />
          </div>
        </ResponsiveContainer>
      </HashRouter>
    )
  }
}

export default App;

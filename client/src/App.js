import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import {
    Route,
    HashRouter
  } from "react-router-dom";
import HomePage from './HomePage'
import MapPage from './MapPage'
import ResponsiveContainer from './ResponsiveContainer'


class App extends Component {
  constructor(props){
    super();
    this.state = {firstView: true}
  }

  componentWillMount(){

  }

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

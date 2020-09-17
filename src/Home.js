import React, { Component } from 'react'
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

import './Home.scss'

import DynamicForm from './DynamicForm'
import Intro from './Intro'
import PaymentResult from './PaymentResult'

export class Home extends Component {

    constructor(props) {
        super(props)

        this.state = {
            showForm: false,
            isAtSummary: false
        }
    }

    render() {

        return (
            <div className={'home'} style={this.state.isAtSummary ? { backgroundImage: 'none' } : {}}>
                <div className={'home-content'}>
                    {
                        <Router basename="/">
                            <Switch>
                                <Route exact path="/" component={Intro} />
                                <Route path="/form" component={DynamicForm} />
                                <Route path="/:yayOrNay" component={PaymentResult} />
                            </Switch>
                        </Router>
                    }
                </div>
                {/* <div class="checkout-overlay">
                    <div class="checkout-container">
                        Would you like to confirm payment of $1300?
                    </div>
                </div> */}
            </div >
        )
    }
}

export default Home

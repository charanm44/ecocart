import React, { Component } from 'react'
import { Redirect } from 'react-router-dom';

import './Intro.scss'

import Button from 'react-bootstrap/Button'

export class Intro extends Component {

    constructor(props) {
        super(props)

        this.state = {
            navigateToForm: null
        }
    }

    render() {

        if (this.state.navigateToForm)
            return <Redirect to="/form" push={true} />

        return (
            <div class="intro">
                <div class="header">Calculate your carbon footprint</div>
                <div class="subheader nudge-down">Find your environmental impact in less than 5 minutes</div>
                <Button className={'button-start'} onClick={() => /*this.props.handleClick()*/ {
                    this.setState({ navigateToForm: true })
                }} variant="success">Get Started</Button>{''}
            </div>
        )
    }
}

export default Intro

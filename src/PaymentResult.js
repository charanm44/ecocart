import React, { Component } from 'react'

import './PaymentResult.scss'

import Button from 'react-bootstrap/Button'

export class Intro extends Component {

    constructor(props) {
        super(props)

        // this.state = {
        //     navigateToForm: null
        // }
    }

    render() {

        // if (this.state.navigateToForm)
        //     return <Redirect to="/form" push={true} />
        let { yayOrNay } = this.props.match.params;

        return (
            <div class="intro">
                <div className={'header' + (yayOrNay.toLowerCase().includes('fail') ? ' fail' : '' ) }>{yayOrNay.toUpperCase()}</div>
            </div>
        )
    }
}

export default Intro

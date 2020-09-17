import React, { Component } from 'react'
import './DynamicForm.scss'

import { CarbonData } from './CarbonData'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLongArrowAltLeft, faLongArrowAltRight, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import ProgressBar from 'react-bootstrap/ProgressBar'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import Modal from 'react-bootstrap/Modal'
import Spinner from 'react-bootstrap/Spinner'

import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

export class DynamicForm extends Component {

    constructor(props) {
        super(props)

        this.state = {
            currentIndex: 0,
            path: [0],
            pathAbs: null,
            selectedAnswers: [],
            carbonScores: [],
            currAnswer: [],
            options: [],
            disabled: true,
            isAtSummary: false,
            checkoutModalShow: false,
            payableAmount: 10,
            productName: "Test",
            clickedCheckoutConfirm: false,
            connectionError: false
        }
    }

    nextQuestionHandler = () => {
        var { selectedAnswers, carbonScores, options, currAnswer, path } = this.state

        console.log('nextQuestionHandler / currAnswer:', currAnswer);

        // computing score for this question
        var score = 0
        for (var i = 0; i < currAnswer.length; i++) {
            var thisAnswer = currAnswer[i]
            var thisAnswerScore = options[i].score
            if (thisAnswer == null || thisAnswerScore == null) continue
            if (typeof (thisAnswerScore) != 'string') score += thisAnswerScore
            else if (thisAnswerScore.includes('value')) score += eval(thisAnswerScore.replace('value', thisAnswer))
            else if (thisAnswerScore.includes('prevScore')) {
                console.log('Hi')
                score += eval(thisAnswerScore.replace('prevScore', carbonScores[carbonScores.length - 1]))
                console.log('Hello')
            }
            else if (thisAnswerScore.includes('prevSelections')) score += eval(thisAnswerScore.replace('prevSelections', `'${selectedAnswers[selectedAnswers.length - 1]}'.split(',')`))
        }
        carbonScores.push(score)
        console.log('Score', carbonScores)

        selectedAnswers.push(currAnswer)  // commits currently selected answer
        console.log('Selected answers', selectedAnswers)
        currAnswer = []  // resets currently selected answer
        path.push(path[path.length - 1] + 1)  // moves to next question
        console.log('Path', path)

        if (path[path.length - 1] < CarbonData.length) {
            const questionObject = CarbonData[path[path.length - 1]]
            var { condition } = questionObject
            if (condition != null) {
                condition = condition.replace('prevSelections', `'${selectedAnswers[selectedAnswers.length - 1]}'.split(',')`)
                console.log('Question\'s gating condition', condition)  // [revisit] remove
                var result = eval(condition)
                if (typeof (result) == 'boolean')
                    if (!result) {
                        if (path[path.length - 1] + 1 < CarbonData.length) path.push(path.pop() + 1)
                        else this.handleSubmit()
                    }
            }
        } else {  // if next question is out of bounds
            this.handleSubmit()
            return
        }

        this.setState({
            path,
            pathAbs: path.join(' '),
            currAnswer,
            carbonScores,
            disabled: true
        })
    }

    prevQuestionHandler = () => {
        var { selectedAnswers, carbonScores, currAnswer, path } = this.state

        currAnswer = selectedAnswers.pop()  // moves back to previous question's answer in stack
        carbonScores.pop()  // moves score to previous state
        path.pop()  // moves to previous question

        this.setState({
            path,
            pathAbs: path.join(' '),
            currAnswer,
            carbonScores,
            disabled: false
        })
    }

    componentDidMount() {
        const { path } = this.state;
        this.setState(() => {
            return {
                question: CarbonData[path[path.length - 1]].question,
                options: CarbonData[path[path.length - 1]].options,
            }
        }
        )
        document.addEventListener("keydown", (event) => {
            if (event.keyCode == 13 && this.state.currAnswer.length != 0) this.nextQuestionHandler()
        })
    }

    checkAnswer = (answerIndex, answer, callback) => {
        var { currAnswer, options, path } = this.state
        var multiple = path[path.length - 1] < CarbonData.length ? CarbonData[path[path.length - 1]].multiple : false
        if (multiple) {
            if (answer == currAnswer[answerIndex]) currAnswer[answerIndex] = null
            else currAnswer[answerIndex] = answer
        } else {
            currAnswer = Array.from(Array(options.length), () => null)
            currAnswer[answerIndex] = answer
        }
        console.log('Curr answer', currAnswer)
        this.setState({
            currAnswer,
            disabled: currAnswer.toString().length == currAnswer.length - 1
        }, () => {
            callback();
        })
    }

    componentDidUpdate(prevProps, prevState) {
        const { path, pathAbs } = this.state;
        if (pathAbs != prevState.pathAbs) {
            this.setState(() => {
                return {
                    question: CarbonData[path[path.length - 1]].question,
                    options: CarbonData[path[path.length - 1]].options
                }
            });
        }
    }

    handleSubmit = () => {
        this.setState({
            currAnswer: [],
            isAtSummary: true
        })
        // this.props.handleSubmit()
    }

    overToStripe = async () => {
        this.setState({ clickedCheckoutConfirm: true });
        const stripe = await stripePromise;
        const response = await fetch("https://ecocart-stripe-server.herokuapp.com/create-session", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName: this.state.productName, payableAmount: this.state.payableAmount })
        });
        if (response.error) {
            this.setState({ clickedCheckoutConfirm: false, connectionError: true });
            return;
        }
        const session = await response.json();
        // When the customer clicks on the button, redirect them to Checkout.
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });
        if (result.error) {
            // If `redirectToCheckout` fails due to a browser or network
            // error, display the localized error message to your customer
            // using `result.error.message`.
            this.setState({ clickedCheckoutConfirm: false, connectionError: true })
        }
    }

    render() {
        var { question, options, path, currAnswer, disabled, isAtSummary, carbonScores } = this.state
        currAnswer = currAnswer.length == 0 ? Array.from(Array(options.length), () => null) : currAnswer
        const questionObj = CarbonData[path[path.length - 1]]

        // if this render is actually the summary
        var emissions, trees, homes
        if (isAtSummary) {
            var totalScore = 0
            for (let score of carbonScores) totalScore += score
            options = [
                {
                    "type": "text",
                    "value": '$' + (totalScore * 10.6).toFixed(2),
                    "aside": "Offset my emissions last year"
                },
                {
                    "type": "text",
                    "value": '$' + (totalScore * 0.9).toFixed(2),
                    "aside": "Offset my emissions last month"
                },
                {
                    "type": "text",
                    "value": '$' + (totalScore * 0.9 * 3).toFixed(2),
                    "aside": "Offset my emissions last 3 months"
                },
                {
                    "type": "input",
                    "value": "Offset what you want",
                    "aside": "$"
                }
            ]
            emissions = Math.round(totalScore * 2205)
            trees = Math.round(totalScore * 4.41)
            homes = Math.round(totalScore * 0.4)
        }

        return (
            <div class="form">
                {!isAtSummary &&
                    <div class="progress-container">
                        <div class="progress-text">{
                            `${(disabled ? path[path.length - 1] : path[path.length - 1] + 1)} of ${CarbonData.length} answered`
                        }</div>
                        <ProgressBar now={(disabled ? path[path.length - 1] : path[path.length - 1] + 1) / CarbonData.length * 100} />
                    </div>
                }
                {!isAtSummary
                    ? <Row>
                        <Col xs="5">
                            <img class="question-image" src={require(`./assets/images/${questionObj.icon}.png`)}></img>
                        </Col>
                        <Col className={'flex-center'}>
                            <div class="header">{question}</div>
                            {questionObj.multiple &&
                                <div class="text-left nudge-down subheader">Select multiple.</div>
                            }
                        </Col>
                    </Row>
                    : <div>
                        <div class="subheader">Your annual carbon emissions are:</div>
                        <div className={'stats-container nudge-down'}>
                            <div class="stat-container">
                                <img className={'stat-image'} src={require(`./assets/images/co2.png`)}></img>
                                <div className={'stat-value'}>{emissions}</div>
                                <div>lbs of CO2</div>
                            </div>
                            <div class="stat-separator">
                                =
                        </div>
                            <div class="stat-container nudge-right">
                                <img className={'stat-image'} src={require(`./assets/images/tree_icon.png`)}></img>
                                <div className={'stat-value'}>{trees}</div>
                                <div>trees cut down</div>
                            </div>
                            <div class="stat-separator">
                                OR
                        </div>
                            <div class="stat-container nudge-right">
                                <img className={'stat-image'} src={require(`./assets/images/home.png`)}></img>
                                <div className={'stat-value'}>{homes}</div>
                                <div>homes powered</div>
                            </div>
                        </div>
                        <div className={'summary-tagline'}>
                            Join the fight against Climate Change by offsetting your carbon footprint
                            <OverlayTrigger
                                key={'top'}
                                trigger="click"
                                placement={'top'}
                                overlay={
                                    <Tooltip id={`tooltip-${'top'}`}>
                                        Offset your carbon footprint by heping protect the <a className={'boldface-link'} href="#">Tri-City Forest</a>
                                    </Tooltip>
                                }
                            >
                                <FontAwesomeIcon className={'nudge-right'} icon={faQuestionCircle} />
                            </OverlayTrigger>
                        </div>
                    </div>
                }
                <div className={'nudge-down-l'}>
                    {options.length != 1
                        ? Object.keys(options).map(answerIndex =>
                            <Card key={`${path[path.length - 1]}${answerIndex}`} className={`nudge-down options ${currAnswer[answerIndex] != null ? "options-selected" : ''} ${isAtSummary ? "options-stats" : ''}`}
                                onClick={() => {
                                    if (this.state.isAtSummary) { this.setState({ payableAmount: options[answerIndex].value.substring(1), productName: options[answerIndex].aside, checkoutModalShow: true }); return; }
                                    this.checkAnswer(answerIndex, options[answerIndex].type == 'input' && currAnswer[answerIndex] == null ? '' : options[answerIndex].type == 'input' ? currAnswer[answerIndex] : options[answerIndex].value, () => {
                                        if (options[answerIndex].type != 'input' && !questionObj.multiple) this.nextQuestionHandler();
                                    });
                                }} body>
                                <Row>
                                    <Col>{options[answerIndex].value}</Col>
                                    <Col className={'text-right'}>
                                        {options[answerIndex].type == 'input' && currAnswer[answerIndex] != null &&
                                            <input onClick={(event) => event.stopPropagation()} onChange={(event) => this.checkAnswer(answerIndex, event.target.value, () => { })} type={'text'} className={'option-input'} value={currAnswer[answerIndex]}></input>
                                        }
                                        <span className={'option-aside'}>{options[answerIndex].aside}</span>
                                    </Col>
                                </Row>
                            </Card>
                        )
                        : <div>
                            <input onChange={(event) => this.checkAnswer(0, event.target.value, () => { })} type={'text'} placeholder={options[0].value} className={'option-input-only'}></input>
                            <span className={'option-aside'}>{options[0].aside}</span>
                        </div>
                    }
                </div>

                {!isAtSummary &&
                    <Row className={'nudge-down-l'}>
                        <Col className={'text-left'}>
                            {path.length > 1 &&
                                <Button className={'action-button back-button'} onClick={this.prevQuestionHandler} variant="success">
                                    <FontAwesomeIcon className={'nudge-left-l'} icon={faLongArrowAltLeft} />
                                    BACK
                                </Button>
                            }
                        </Col>
                        <Col className={'text-right'}>
                            <Button className={'action-button'} disabled={this.state.disabled} onClick={this.nextQuestionHandler} variant="success">
                                NEXT
                                <FontAwesomeIcon className={'nudge-right-l'} icon={faLongArrowAltRight} />
                            </Button>
                        </Col>
                    </Row>
                }

                <Modal show={this.state.checkoutModalShow} onHide={() => this.setState({ checkoutModalShow: false })} size={'lg'} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Awesome! Would you like to confirm payment?</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>To: <span class="">{this.state.productName}</span></div>
                        <div>Amount = <span class="subheader">${this.state.payableAmount}</span></div>
                    </Modal.Body>
                    <Modal.Footer>
                        {this.state.connectionError &&
                            <div class="error-text">Oops! That errored out. Please click again.</div>
                        }
                        <Button className={'action-button'} disabled={this.state.clickedCheckoutConfirm} variant="success" onClick={() => { this.overToStripe(); /*this.setState({ checkoutModalShow: false });*/ }}>
                            CONFIRM
                            {!this.state.clickedCheckoutConfirm &&
                                <FontAwesomeIcon className={'nudge-right-l'} icon={faLongArrowAltRight} />
                            }
                            {this.state.clickedCheckoutConfirm &&
                                <Spinner className={'nudge-right'} animation="border" variant="light" />
                            }
                        </Button>
                        {/* <Button variant="secondary" onClick={() => this.setState({ checkoutModalShow: false })}>
                            Close
                        </Button>
                        <Button variant="primary" onClick={() => this.setState({ checkoutModalShow: false })}>
                            Save Changes
                        </Button> */}
                    </Modal.Footer>
                </Modal>

            </div>

        )
    }
}

export default DynamicForm

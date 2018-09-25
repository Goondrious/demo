import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  Button,
  Container,
  Grid,
  Header,
  Icon,
  List,
  Segment,
  Transition,
  Pagination,
  Input,
  Message
} from 'semantic-ui-react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts';
import DetailedTable from './Components/DetailedTable'
import moment from 'moment'

//overlay that shows up first time you hit the page, click to transition to stats HomePage
const HomepageHeading = ({ getStarted, mobile }) => (
  <Container text>
    <Header
      as='h1'
      content="This is a demo!"
      inverted
      style={{
        fontSize: mobile ? '2em' : '4em',
        fontWeight: 'normal',
        marginBottom: 0,
        marginTop: mobile ? '1.5em' : '3em',
      }}
    />
    <Button onClick={ getStarted } primary size='huge'>
      Get Started
      <Icon name='right arrow' />
    </Button>
  </Container>
)

HomepageHeading.propTypes = {
  mobile: PropTypes.bool,
}

//catch generic errors, handle 429 separately for custom message
const checkStatus = (res) => {
	if (res.status >= 200 && res.status < 300 || res.status === 429) {
	  return res
	} else {
		//generic error
		throw new Error("There was an error pulling the data from the server")
	}
}

class HomePage extends Component {
	constructor(props){
	  super();
	  this.state = { firstView: props.firstView, 
	  	statChartData: [], statChartLoaded: false, statChartKey: "impressions", 
	  	eventChartData: [], eventChartLoaded: false,
	  	tableData: [],
	  	tableHeaders: [{display: "Date", key: "date"}, 
	  	{display: "Hour", key: "hour"},
	  	{display: "Point of Interest", key: "name"}, 
	  	{display: "Impressions", key: "impressions"}, 
	  	{display: "Clicks", key: "clicks"}, 
	  	{display: "Revenue", key: "revenue"}],
	  	totalPages: 0,
	  	perPage: 20,
	  	activePage: 1,
	  	tableLoaded: false,
	  	column: null,
	  	direction: null
	  }
	}

	componentWillMount(){
		//pull daily stats and map for chart, calculating summary stats
		fetch('/stats/daily')
		.then(checkStatus)
		.then(res => res.json())
		.then(res => {
			if(res.msg){
				this.setState({statDailyError: true, statDailyErrorMsg: res.msg})
			} else {
				let impressionsMax = 0
				let impressionsTotal = 0
				let clicksMax = 0
				let clicksTotal = 0
				let revenueMax = 0
				let revenueTotal = 0
				let statChartData = res.map(stat => {
					stat.chartDate = new moment(stat.date).format("'YY-MM-DD")
					stat.impressions = parseInt(stat.impressions, 10)
					stat.clicks = parseInt(stat.clicks, 10)
					stat.revenue = parseInt(stat.revenue, 10)
					impressionsMax = Math.max(stat.impressions, impressionsMax)
					impressionsTotal += stat.impressions
					clicksMax = Math.max(stat.clicks, clicksMax)
					clicksTotal += stat.clicks
					revenueMax = Math.max(stat.revenue, revenueMax)
					revenueTotal += stat.revenue
					return stat
				})
				statChartData.impressionsMax = impressionsMax
				statChartData.impressionsTotal = impressionsTotal
				statChartData.clicksMax = clicksMax
				statChartData.clicksTotal = clicksTotal
				statChartData.revenueMax = revenueMax
				statChartData.revenueTotal = revenueTotal
				this.setState({statChartData: statChartData, statMax: statChartData.impressionsMax, 
					statAvg: Math.ceil(statChartData.impressionsTotal/res.length), statChartLoaded: true})
			}
		})
		.catch(error => {
	        this.setState({statDailyError: true, statDailyErrorMsg: error.message})
	    })

		//pull daily events and map for chart, calculating summary stats
		fetch('/events/daily')
		.then(checkStatus)
		.then(res => res.json())
		.then(res => {
			if(res.msg){
				this.setState({statDailyError: true, statDailyErrorMsg: res.msg})
			} else {
				let max = 0
				let total = 0
				let eventChartData = res.map(event => {
					event.chartDate = new moment(event.date).format("'YY-MM-DD")
					event.events = parseInt(event.events, 10)
					max = Math.max(event.events, max)
					total += event.events
					return event
				})
				this.setState({eventChartData: eventChartData, eventMax: max, 
					eventAvg: Math.ceil(total/res.length), eventChartLoaded: true})
			}
		})
		.catch(error => {
	        this.setState({eventDailyError: true, eventDailyErrorMsg: error.message})
	    })

	    //pull hourly stats and map for table, add highlight for search highlighting
		fetch('/stats/hourly')
		.then(checkStatus)
		.then(res => res.json())
		.then(res => {
			if(res.msg){
				this.setState({statDailyError: true, statDailyErrorMsg: res.msg})
			} else {
				let mapped = res.map(stat => {
					stat.chartDate = new moment(stat.date).format("'YY-MM-DD")
					stat.impressions = parseInt(stat.impressions, 10)
					stat.clicks = parseInt(stat.clicks, 10)
					stat.revenue = parseInt(stat.revenue, 10)
					stat.highlight = false
					return stat
				})
				//set up pagination
				let perPage = this.state.perPage
				let tableData = []
				for(let i = 0, j=mapped.length; i<j; i+=perPage){
					tableData.push(mapped.slice(i, i+perPage))
				}
				this.setState({rawTableData: mapped,tableData: tableData, tableLoaded: true})
			}
		}).catch(error => {
	        this.setState({statHourlyError: true, statHourlyErrorMsg: error.message})
	    })
	}

	getStarted = () => {
		this.props.toggleVisibility(); 
		this.setState({ firstView: false })
	}

	//change stat being viewed and metrics
	setStatChart = (e, { name }) => {
		let max = this.state.statChartData[name+"Max"]
		let avg = Math.ceil(this.state.statChartData[name+"Total"]/this.state.statChartData.length)
		this.setState({ statChartKey: name, statMax: max, statAvg: avg })
	}

	changePage = (e, data) =>{
		this.setState({activePage: data.activePage})
	}

	//custom sorting functions for table
	sortFunctions = {
	  	"descending": {
		  	"name": (a,b) => {
		  		let aName = a.toLowerCase()
		  		let bName = b.toLowerCase()
		  		if (aName < bName) {
		  		  return -1;
		  		}
		  		if (aName > bName) {
		  		  return 1;
		  		}
		  		return 0;
		  	},
		  	"date": (a,b) => {
		  		let aDate = new Date(a)
		  		let bDate = new Date(b)
		  		if (aDate < bDate) {
		  		  return 1;
		  		}
		  		if (aDate > bDate) {
		  		  return -1;
		  		}
		  		return 0;
		  	},
		  	"regular": (a,b) => {
		  		return b-a
		  	}
		},
		"ascending": {
		  	"name": (a,b) => {
		  		let aName = a.toLowerCase()
		  		let bName = b.toLowerCase()
		  		if (aName < bName) {
		  		  return 1;
		  		}
		  		if (aName > bName) {
		  		  return -1;
		  		}
		  		return 0;
		  	},
		  	"date": (a,b) => {
		  		let aDate = new Date(a)
		  		let bDate = new Date(b)
		  		if (aDate < bDate) {
		  		  return -1;
		  		}
		  		if (aDate > bDate) {
		  		  return 1;
		  		}
		  		return 0;
		  	},
		  	"regular": (a,b) => {
		  		return a-b
		  	}
		}
	}

	handleSort = clickedColumn => () => {
	  //sort the entire data set, reset page to 1
	  const { column, rawTableData, direction } = this.state
	  let newDirection = 'ascending'
	  let sortedData = rawTableData
	  let sortKey = "regular"
	  clickedColumn === "name" ? sortKey = "name" : clickedColumn === "date" ? sortKey = "date" : null;
	  //clickColumn is ascending and it's the same column, reverse it
	  if (column === clickedColumn && direction === "ascending") {
	  	//switch if same column and direction is asc
	  	newDirection = 'descending'
	  }
	  sortedData.sort((a,b)=>this.sortFunctions[newDirection][sortKey](a[clickedColumn],b[clickedColumn]))
	  //reset pages
	  let perPage = this.state.perPage
	  let tableData = []
	  for(let i = 0, j=rawTableData.length; i<j; i+=perPage){
	  	tableData.push(rawTableData.slice(i, i+perPage))
	  }
	  this.setState({
	    tableData: tableData,
	    direction: newDirection,
	    column: clickedColumn,
	    activePage: 1
	  })
	}

	fuzzySearch = (e, { value }) => {
		//map current table data, setting highlight=true where there is a text match
		this.setState({tableData: this.state.tableData.map(page => {
			return page.map(stat=> {
				stat.highlight = value !== "" && stat.name.toLowerCase().indexOf(value.toLowerCase())>=0
				return stat
			})
		})})
	}

	render(){

		const { firstView, 
			statChartData, statDailyError, statDailyErrorMsg, statChartLoaded, statChartKey,
			eventChartData, eventDailyError, eventDailyErrorMsg, eventChartLoaded,
			statHourlyError, statHourlyErrorMsg, tableHeaders, tableData, tableLoaded,
			 activePage, column, direction, eventAvg,eventMax,statAvg,statMax } = this.state


		return (
		  <div>
		  	<Transition visible={firstView} animation='scale' duration={500}>
			  	<Segment
					inverted
					textAlign='center'
					style={{ minHeight: '100vh', padding: '1em 0em', zIndex: 1000 }}
					vertical
			  	>
			  		<HomepageHeading getStarted={ this.getStarted}/>
			  	</Segment>
		  	</Transition>
		  	<Transition visible={!firstView} animation='scale' duration={1000}>
			  	<div>
				    <Segment style={{ padding: '4em 0em' }} vertical>
						<Grid container stackable>
							<Grid.Row>
								<Grid.Column width={8}>
									<Header as='h1'>Events</Header>
									<p>Here's example of event data for a particular week.</p>
									{
										eventDailyError &&
										<Message negative>
									    	<Message.Header>Sorry!</Message.Header>
									    	<p>{eventDailyErrorMsg}</p>
										</Message>
									}
									{
										!eventChartLoaded && 
										!eventDailyError &&
										<Header textAlign="center" as='h1'>
											<Icon loading name='spinner' />
										</Header>
									}
									{
										eventChartLoaded &&
										<ResponsiveContainer width='100%' aspect={4.0/3.0}>
											<BarChart data={eventChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
												<XAxis padding={{left: 35, right: 35}} dataKey="chartDate" />
												<YAxis tickCount={11} interval={"preserveStart"} type="number" domain={[0,"dataMax"]} />
												<CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
												<Tooltip />
												<Bar dataKey="events" fill="#8884d8"/>
											</BarChart>
										</ResponsiveContainer>
									}
								</Grid.Column>
								<Grid.Column width={8}>
									<Header as='h1'>Stats</Header>
									<p>And here is some more detailed data from that same week.</p>
								    <Button.Group fluid>
								      <Button name="impressions" onClick={this.setStatChart} active={ statChartKey === "impressions" }>Impressions</Button>
								      <Button.Or />
								      <Button name="clicks" onClick={this.setStatChart} active={ statChartKey === "clicks" }>Clicks</Button>
								      <Button.Or />
								      <Button name="revenue" onClick={this.setStatChart} active={ statChartKey === "revenue" }>Revenue</Button>
								    </Button.Group>
								    {
								    	statDailyError &&
								    	<Message negative>
								        	<Message.Header>Sorry!</Message.Header>
								        	<p>{statDailyErrorMsg}</p>
								    	</Message>
								    }
									{
										!statChartLoaded &&
										!statDailyError &&
										<Header as='h1' textAlign="center"><Icon loading name='spinner' /></Header>
									}
									{
										statChartLoaded &&
										<ResponsiveContainer width='100%' aspect={4.0/3.0}>
											<LineChart data={statChartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
												<Line type="monotone" dataKey={statChartKey} stroke="#8884d8" activeDot={{r: 8}}/>
												<CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
												<XAxis padding={{left: 15, right: 15}} dataKey="chartDate" />
												<YAxis tickCount={11} interval={"preserveStart"} allowDecimals={false} type="number" domain={[0,"dataMax"]} />
												<Tooltip />
											</LineChart>
										</ResponsiveContainer>
									}
								</Grid.Column>
							</Grid.Row>
						</Grid>
					</Segment>
					<Segment style={{ padding: '0em' }} vertical>
						<Grid celled='internally' columns='equal' stackable>
							<Grid.Row textAlign='center'>
								<Grid.Column style={{ paddingBottom: '2em', paddingTop: '2em' }}>
									<Message>
										<Message.Header>Event Summary</Message.Header>
										<Message.List>
											<Message.Item>Average: {eventAvg}</Message.Item>
											<Message.Item>Max: {eventMax}</Message.Item>
										</Message.List>
									</Message>
								</Grid.Column>
									<Grid.Column style={{ paddingBottom: '2em', paddingTop: '2em' }}>
									<Message>
										<Message.Header>Stat Summary</Message.Header>
										<Message.List>
											<Message.Item>Average: {statAvg}</Message.Item>
											<Message.Item>Max: {statMax}</Message.Item>
										</Message.List>
									</Message>
								</Grid.Column>
							</Grid.Row>
						</Grid>
					</Segment>
					<Segment style={{ padding: '5em 0em' }} vertical>
						<Container text>
							{
								statHourlyError &&  
								<Message negative>
									<Message.Header>Sorry!</Message.Header>
									<p>{statHourlyErrorMsg}</p>
								</Message>
							}
							{
								!tableLoaded && 
								!statHourlyError &&
								<Header textAlign="center" as='h1'><Icon loading name='spinner' /></Header>
							}
							{
								tableLoaded && 
								<div>
									<Input style={{ marginBottom: 10 }} placeholder="Search location..." onChange={this.fuzzySearch} />
									<Grid.Row>
										<Pagination onPageChange={this.changePage} activePage={activePage} totalPages={tableData.length} />
									</Grid.Row>
									<DetailedTable handleSort={this.handleSort} column={column} direction={direction} headers={tableHeaders} data={tableData[activePage-1]} />
								</div>
								}
						</Container>
					</Segment>
					<Segment inverted vertical style={{ padding: '5em 0em' }}>
						<Container>
							<Grid divided inverted stackable>
								<Grid.Row>
									<Grid.Column width={7}>
										<Header inverted as='h4' content="Thanks for scrolling to the bottom, there's one more page with a map on it." />
									</Grid.Column>
									<Grid.Column width={7}>
										<p>You came a long way, congrats!</p>
									</Grid.Column>
								</Grid.Row>
							</Grid>
						</Container>
				    </Segment>
			    </div>
		    </Transition>
		  </div>
		)
	}
}

export default HomePage
import React, { Component } from 'react'
import ReactMapboxGl, { ZoomControl, GeoJSONLayer } from "react-mapbox-gl";
import { Grid, Segment, Header, Icon, Button, Input, Form, Message } from 'semantic-ui-react'
import moment from 'moment';

//white-list ip of server and obscure this key in backend api, requiring JWT to retrieve
const Map = ReactMapboxGl({
  accessToken: ""
});

//catch generic errors, handle 429 separately for custom message
const checkStatus = (res) => {
	if (res.status >= 200 && res.status < 300 || res.status === 429) {
	  return res
	} else {
		//generic error
		throw new Error("There was an error pulling the data from the server")
	}
}

class MapPage extends Component {

	constructor(props){
		super();
		this.state={
			error: false, 
			fromDate: moment().format("YYYY-MM-DD"), 
			fromHour: 0, 
			toDate: moment().add(1,'days').format("YYYY-MM-DD"), 
			toHour: 23, 
			mapKey: "impressions", 
			mapLoaded: false
		}
	}

	componentWillMount(){
		fetch('/map')
		.then(checkStatus)
		.then(res => res.json())
		.then(res => {
			if(res.msg){
				this.setState({error: true, errorMsg: res.msg})
			} else {
				//just need one "feature" for each unique lng/lat pair, and can group data within that
				let featureMetrics = {} //key = lng//lat
				let features = [] //array of keys
				let minDate = false
				let maxDate = false
				let mapped = res.map(stat => {
					let featureKey = stat.lon+"//"+stat.lat
					if(!featureMetrics.hasOwnProperty(featureKey)){
						features.push([stat.lon,stat.lat])
						featureMetrics[featureKey] = {impressions: 0, revenue: 0, clicks: 0, events: 0}
					}
					featureMetrics[featureKey].clicks += stat.clicks
					featureMetrics[featureKey].revenue += stat.revenue
					featureMetrics[featureKey].impressions += stat.impressions
					featureMetrics[featureKey].events += stat.events
					let date = moment(stat.date).startOf('day')
					stat.dateTime = date.add(stat.hour,'hours') //dates are received with incorrect hour value ... reformat for easier filtering with datetime select
					minDate ? minDate > date ? minDate = date : null : minDate = date
					maxDate ? maxDate < date ? maxDate = date : null : maxDate = date
					return stat
				})
				this.setState({features: features, featureMetrics: featureMetrics, 
					mappedStats: mapped, mapLoaded: true, 
					fromDate: minDate.format("YYYY-MM-DD"), toDate: maxDate.format("YYYY-MM-DD")})
			}
		}).catch(error => {
	          this.setState({error: true, errorMsg: error.message})
	    })
	}

	setMapData = (e, { name }) => {
		this.setState({mapKey: name})
	}

	changeDateTime = (e, { name, value }) => {
		if(value!==""){
			this.setState({[name]: value})
		}
	}

	render(){
		const { mapLoaded, mappedStats, mapKey, fromHour, fromDate, toHour, toDate, error, errorMsg } = this.state
		let features;
		let featureMetrics;
		let geoJSON;
		if(mapLoaded){
			//group features and create metrics for the filtered list, filtered between datetime
			//recalculate every render
			featureMetrics = {} //key = lng//lat, value is metrics
			features = [] //array of lnglat
			let fromDateTime = moment(fromDate).startOf('day').add(fromHour, 'hours')
			let toDateTime = moment(toDate).startOf('day').add(toHour, 'hours')
			let minMetric = 0
			let maxMetric = 0
			mappedStats.filter(stat => stat.dateTime >= fromDateTime && stat.dateTime<= toDateTime).map(stat => {
				let featureKey = stat.lon+"//"+stat.lat
				if(!featureMetrics.hasOwnProperty(featureKey)){
					features.push([stat.lon,stat.lat])
					featureMetrics[featureKey] = {name: stat.name, count: 0}
					featureMetrics[featureKey][mapKey] = 0
				}
				featureMetrics[featureKey][mapKey] += parseInt(stat[mapKey], 10)
				featureMetrics[featureKey].count ++
				minMetric = Math.min(featureMetrics[featureKey][mapKey],minMetric)
				maxMetric = Math.max(featureMetrics[featureKey][mapKey], maxMetric)
				return stat
			})

			//convert metric value to size of the circles, based on where it falls between max and min value for the set
			//min = 0 * 25 + 10 = 10
			//max = 1 * 25 + 10 = 35
			for(let feature in featureMetrics){
				featureMetrics[feature].size = (featureMetrics[feature][mapKey] - minMetric) / (maxMetric - minMetric) * 25 +10
			}

			//create geoJSON based on data
			//pass relevant data as "properties"
			geoJSON = 
			{
			  "type": "FeatureCollection",
			  "features": features.map(feature => {
			  	return {
			  		"type": "Feature",
			  		"geometry": {
			  			"type": "Point",
			  			"coordinates": feature
				  	},
				  	"properties": {
				  	  "title": featureMetrics[feature[0]+"//"+feature[1]].name,
				  	  "metric": featureMetrics[feature[0]+"//"+feature[1]][mapKey],
				  	  "count": featureMetrics[feature[0]+"//"+feature[1]].count,
				  	  "size": featureMetrics[feature[0]+"//"+feature[1]].size
				  	}
				  }
			  })
			}
		}
		return(
			<Segment>
				<Grid centered verticalAlign="middle">
					<Grid.Row>
						<Grid.Column width={12}>
							<Header as='h1' icon textAlign="center">
								<Icon name='map' />
								Data Visualization
							</Header>
							<Message
							  	info
							    icon='database'
							    header='Display Metric'
							    content='Choose the data you want to see on the map'
							 />
							<Button.Group fluid>
							    <Button name="impressions" onClick={this.setMapData} active={ mapKey === "impressions" }>Impressions</Button>
							    <Button.Or />
							    <Button name="clicks" onClick={this.setMapData} active={ mapKey === "clicks" }>Clicks</Button>
							    <Button.Or />
							    <Button name="revenue" onClick={this.setMapData} active={ mapKey === "revenue" }>Revenue</Button>
							    <Button.Or />
							    <Button name="events" onClick={this.setMapData} active={ mapKey === "events" }>Events</Button>
							</Button.Group>
							<Message
								info
							    icon='calendar alternate'
							    header='Date Range'
							    content='And the date/time range to scope the data'
							/>
							<Form>
								<Form.Group>
									<Form.Field width={6}>
								  		<label>From Day</label>
								  		<Input type="date" value={fromDate} name="fromDate" onChange={this.changeDateTime} />
									</Form.Field>
									<Form.Field width={2}>
								  		<label>Hour</label>
								  		<Input type="number" value={fromHour} min="0" max="23" name="fromHour" onChange={this.changeDateTime} />
									</Form.Field>
									<Form.Field width={6}>
								  		<label>To Day</label>
								  		<Input type="date" value={toDate} name="toDate" onChange={this.changeDateTime} />
									</Form.Field>
									<Form.Field width={2}>
								  		<label>Hour</label>
								  		<Input type="number" value={toHour} min="0" max="23" name="toHour" onChange={this.changeDateTime} />
									</Form.Field>
								</Form.Group>
							</Form>
						</Grid.Column>
					</Grid.Row>
					<Grid.Row>
						<Grid.Column width={14}>
							{
								error &&
								<Message negative>
							    	<Message.Header>Sorry!</Message.Header>
							    	<p>{errorMsg}</p>
							  	</Message>
							}
							{
								!mapLoaded &&
								!error &&
								<Header textAlign="center" as='h1'><Icon loading name='spinner' /></Header>
							}
							{
								mapLoaded &&
								<Map
									style="mapbox://styles/mapbox/dark-v9"
									containerStyle={{
								    	width: "100%",
								    	height: "80vh"
								  	}}
								  zoom={[3]}
								  center={[-100,48]}
								>
							  		<ZoomControl />
								  	<GeoJSONLayer
								  		data={geoJSON}
								  		circlePaint={{"circle-radius": ['step', ['get', 'point_count'], 25, 2, 30, 3, 40], "circle-color": "#114dad", "circle-stroke-width": 2, "circle-stroke-color": "#fff"}}
								  		sourceOptions={{cluster: true, clusterMaxZoom: 20, clusterRadius: 20}}
								  		layerOptions={{filter: ["has", "point_count"]}}
								  		circleOnClick={(e)=>{console.log(e.features)}}
								  		circleOnMouseEnter={(obj)=>{console.log(obj)}}
								  	/>
								  	<GeoJSONLayer 
								  		data={geoJSON}
								  		symbolLayout={{"text-field": "{point_count} POIs"}}
								  		sourceOptions={{cluster: true, clusterMaxZoom: 20, clusterRadius: 20}}
								  		layerOptions={{filter: ["has", "point_count"]}}
								  	/>
								  	<GeoJSONLayer 
								  		data={geoJSON}
								  		circlePaint={{"circle-radius": ['get', 'size'], "circle-color": "#11b4da", "circle-stroke-width": 2, "circle-stroke-color": "#fff"}}
								  		layerOptions={{filter: ["!",["has", "point_count"]]}}
								  		sourceOptions={{cluster: true, clusterMaxZoom: 20, clusterRadius: 20}}
								  		circleOnClick={(e)=>{console.log(e.features)}}
								  	/>
								  	<GeoJSONLayer 
								  		data={geoJSON}
								  		symbolLayout={{"text-field": "{metric}"}}
								  		sourceOptions={{cluster: true, clusterMaxZoom: 20, clusterRadius: 20}}
								  		layerOptions={{filter: ["!",["has", "point_count"]]}}
								  	/>
								</Map>
							}
						</Grid.Column>
					</Grid.Row>
				</Grid>
			</Segment>
		)
	}
}

export default MapPage

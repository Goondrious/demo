import React, { Component } from 'react'
import ReactMapboxGl, { Layer, Feature, ZoomControl, Popup, GeoJSONLayer } from "react-mapbox-gl";
import { Grid, Segment, Header, Icon, Button, Input, Form, Message } from 'semantic-ui-react'
import moment from 'moment';

//white-list ip of server and/or obscure this key in backend api, requiring JWT to retrieve
const Map = ReactMapboxGl({
  accessToken: "pk.eyJ1IjoiZ29vbmRyaW91cyIsImEiOiJjam1jNjdlbWM1dmY1M2tvZzh3cmtnemd3In0.zoVjvWEcv3VW-7U2Y_7wRg"
});

class MapPage extends Component {

	constructor(props){
		super();
		this.state={error: false, fromDate: moment().format("YYYY-MM-DD"), fromHour: 0, toDate: moment().add(1,'days').format("YYYY-MM-DD"), toHour: 23, mapKey: "impressions", mapLoaded: false}
	}

	componentWillMount(){
		//merge both datasets in one call?
		fetch('/map')
		.then(res => res.json())
		.then(res => {
			//just need one feature for each unique lnglat
			//"intensity" is based on total of each metric, ranked somehow relative to max/min
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
				stat.events == null ?  stat.events = 0 : null;
				featureMetrics[featureKey].events += stat.events
				let date = moment(stat.date).startOf('day')
				stat.dateTime = date.add(stat.hour,'hours') //dates are received with incorrect hour value ... reformat for easier filtering with datetime select
				minDate ? minDate > date ? minDate = date : null : minDate = date
				maxDate ? maxDate < date ? maxDate = date : null : maxDate = date
				// stat.chartDate = new Date(stat.date).getFullYear()+"-"+(new Date(stat.date).getMonth()+1)+"-"+new Date(stat.date).getDate()
				// stat.impressions = parseInt(stat.impressions)
				// stat.clicks = parseInt(stat.clicks)
				// stat.revenue = parseInt(stat.revenue)
				// stat.lat = parseInt(stat.lat)
				// stat.lon = parseInt(stat.lon)
				return stat
			})
			this.setState({features: features, featureMetrics: featureMetrics, mappedStats: mapped, filteredStats: mapped, mapLoaded: true, fromDate: minDate.format("YYYY-MM-DD"), toDate: maxDate.format("YYYY-MM-DD")})
		}).catch(error => {
	          this.setState({error: true})
	    })
	}

	setMapData = (e, { name }) => {
		this.setState({mapKey: name})
	}

	changeDateTime = (e, { name, value }) => {
		console.log(e)
		console.log(name,value)
		if(value!=""){
			this.setState({[name]: value})
		}
	}

	createGeoJSON = () => {
		let mappedStats = this.state.mappedStats
		let geoJSON = 
		{
		  "type": "Feature",
		  "geometry": {

		  },
		  "properties": {
		    "name": "Customer Interaction Metrics by Point of Interest"
		  }
		}

	}

	render(){
		const { mapLoaded, mappedStats, mapKey, fromHour, fromDate, toHour, toDate, error } = this.state
		let features;
		let featureMetrics;
		let geoJSON;
		if(mapLoaded){
			//group features and create metrics for the filtered list
			//filtered between dateTimes
			//recalculate every render
			featureMetrics = {} //key = lng//lat, value is metrics
			features = [] //array of lnglat
			let fromDateTime = moment(fromDate).startOf('day').add(fromHour, 'hours')
			let toDateTime = moment(toDate).startOf('day').add(toHour, 'hours')
			console.log("dates!",fromDateTime, toDateTime)
			let minMetric = 0
			let maxMetric = 0
			mappedStats.filter(stat => stat.dateTime >= fromDateTime && stat.dateTime<= toDateTime).map(stat => {
				let featureKey = stat.lon+"//"+stat.lat
				if(!featureMetrics.hasOwnProperty(featureKey)){
					features.push([stat.lon,stat.lat])
					featureMetrics[featureKey] = {name: stat.name, count: 0}
					featureMetrics[featureKey][mapKey] = 0
				}
				featureMetrics[featureKey][mapKey] += parseInt(stat[mapKey])
				featureMetrics[featureKey].count ++
				minMetric = Math.min(featureMetrics[featureKey][mapKey],minMetric)
				maxMetric = Math.max(featureMetrics[featureKey][mapKey], maxMetric)
				return stat
			})

			//rank the metrics
			for(let feature in featureMetrics){
				featureMetrics[feature].size = (featureMetrics[feature][mapKey] - minMetric) / (maxMetric - minMetric) * 25 +10
			}

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
		console.log("features!",features, featureMetrics, geoJSON)
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
							{error &&  <Message negative>
							    <Message.Header>Sorry!</Message.Header>
							    <p>There was an error pulling the data from the server</p>
							  </Message>}
							{!mapLoaded && !error && <Header textAlign="center" as='h1'><Icon loading name='spinner' /></Header>}
							{mapLoaded && <Map
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
							</Map>}
						</Grid.Column>
					</Grid.Row>
				</Grid>
			</Segment>
		)
	}
}

export default MapPage
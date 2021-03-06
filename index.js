const express = require('express')
const pg = require('pg')
require('dotenv').config()
const app = express()
const path = require('path')
// configs come from standard PostgreSQL env vars
// https://www.postgresql.org/docs/9.6/static/libpq-envars.html
const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
})

//use built React for front end
app.use("/", express.static(path.join(__dirname,`/client/build`)));

//import custom rate limiter
var rateLimit = require('./lib/rate-limit')
//define rules
let rules = [
  {
    name: "basicSecondRule",
    type: "ip",
    unit: "second",
    expiry: 5,
    limit: 3,
    warningMsg: "This last request put you at the limit",
    errorMsg: "You are over the request limit for this api route"
  },
  {
    name: "basicMinuteRule",
    type: "ip",
    unit: "minute",
    expiry: 1,
    limit: 10,
    warningMsg: "This last request put you at the per minute limit",
    errorMsg: "You are over the per minute limit for this api route"
  },
  {
    name: "strictMinuteRule",
    type: "ip",
    unit: "minute",
    expiry: 1,
    limit: 2,
    warningMsg: "This last request put you at the per minute limit",
    errorMsg: "You are over the per minute limit for this api route"
  }
]

//store the rules for later use
rateLimit.initRateLimit(rules)

//define middleware for rate limiting and how to handle excessive requests
// ret object contains boolean `limit` and if true, the error message defined above
let basicLimit = (req,res,next) => {
    let ret = rateLimit.assignLimit(req.connection.remoteAddress, req.route.path, ["basicMinuteRule", "basicSecondRule"])
    if(ret.limit){
        res.status(429).send({msg: ret.msg})
    } else {
        next()
    }
}

let strictLimit = (req,res,next) => {
    let ret = rateLimit.assignLimit(req.connection.remoteAddress, req.route.path, ["strictMinuteRule"])
    if(ret.limit){
        res.status(429).send({msg: ret.msg})
    } else {
        next()
    }
}

const queryHandler = (req, res, next) => {
  pool.query(req.sqlQuery).then((r) => {
    return res.json(r.rows || [])
  }).catch(next)
}

//number of events at POI at date and start hour
app.get('/events/hourly', basicLimit,(req, res, next) => {
  req.sqlQuery = `
    SELECT *
    FROM public.hourly_events AS a
    INNER JOIN public.poi AS b
    ON a.poi_id = b.poi_id
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)

//summary of hourly_events by date
app.get('/events/daily', basicLimit,(req, res, next) => {
  req.sqlQuery = `
    SELECT date, SUM(events) AS events
    FROM public.hourly_events
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

//impressions, clicks, revenue at POI at date and start hour
app.get('/stats/hourly', strictLimit,(req, res, next) => {
  req.sqlQuery = `
    SELECT *
    FROM public.hourly_stats AS a
    INNER JOIN public.poi AS b
    ON a.poi_id = b.poi_id
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)

//summary of hourly_stats by date
app.get('/stats/daily', basicLimit,(req, res, next) => {
  req.sqlQuery = `
    SELECT date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(revenue) AS revenue
    FROM public.hourly_stats
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

//pull events and stats together with POI information for mapping
//where we can, combine stats and events, but treat missing [poi+date+hour] in either as 0s, though this might not be correct depending on the origins of these datasets
app.get('/map', strictLimit,(req, res, next) => {
  req.sqlQuery = `
    SELECT COALESCE(c.date,b.date) AS date, COALESCE(c.hour,b.hour) AS hour, a.name, a.lon, a.lat, COALESCE(c.impressions,0) AS impressions, 
      COALESCE(c.clicks,0) AS clicks, COALESCE(c.revenue,0) AS revenue, COALESCE(b.events,0) AS events
    FROM public.hourly_events AS b
    FULL JOIN public.hourly_stats AS c
    ON c.poi_id = b.poi_id AND c.date = b.date AND c.hour = b.hour
    INNER JOIN public.poi AS a
    ON a.poi_id = b.poi_id OR a.poi_id = c.poi_id
    LIMIT 168;
  `
  return next()
}, queryHandler)

app.listen(process.env.PORT || 5555, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log(`Running on ${process.env.PORT || 5555}`)
  }
})

// last resorts
process.on('uncaughtException', (err) => {
  console.log(`Caught exception: ${err}`)
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(1)
})

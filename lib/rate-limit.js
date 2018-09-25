const type = ["username", "ip"]
const unit = ["hour", "minute", "second", "millisecond"]
const multiplier = [1000*60*60, 1000*60, 1000, 1]
const storageUnit = {
	"expiry": "",
	"created": "",
	"count": 0
}

//using local storage for simplicity, but some remote storage like redis is a better option for production

//storage and rules held in memory
let storage = {} //storage for counts and expiries
let rules = {} //storage for rules, {name: {type: , unit: , expiry:, limit:, warningMsg: , errorMsg: }}

const setTimeoutInterval = function(key, rule){
	//remove the key after multiplier*value
	console.log("setting interval!", key)
	setTimeout(()=>{clearBucket(key)}, multiplier[unit.indexOf(rule.unit)]*rule.expiry)
}

const clearBucket = function(key){
	//used with setInterval
	console.log("storage expiring! ", key)
	delete storage[key]
}

module.exports = {
	initRateLimit: function(initRules){
		//initialize rules for adding to storage 
		//take in array of rule objects and re-map so the key of the object is the rule name
		rules = initRules.reduce((ret, thisRule) => {
				ret[thisRule.name] = {
					type: thisRule.type,
					unit: thisRule.unit,
					expiry: thisRule.expiry,
					limit: thisRule.limit,
					warningMsg: thisRule.warningMsg,
					errorMsg: thisRule.errorMsg
				}
				return ret
			}
		,{})
	},
	assignLimit: function(identity, route, routeRules){
		//assign a limit to an api route by providing identity, route and the rules to use
		//add support for automatically finding identity or multiple types of identity (e.g. username), possibly by taking in req as parameter
		//currently only uses IP

		//returns true if a limit has been reached
		let overLimit = false
		let overMsg = ""
		routeRules.map(ruleName=> {
			let thisRule = rules[ruleName]
			//create unique key
			let key = identity+":"+thisRule.type+":"+route+":"+thisRule.unit
			if(!storage.hasOwnProperty(key)){
				//first instance of this key, so initialize
				console.log("initializing storage for ", key)
				storage[key] = {count: 1}
				setTimeoutInterval(key, thisRule)
			} else {
				//key already exists so check limit and increment
				console.log("checking storage for ", key, storage[key].count)
				if(storage[key].count>=thisRule.limit){
					storage[key].count++
					overLimit = true
					overMsg = thisRule.errorMsg
				} else {
					storage[key].count++
				}
			}
		})
		return {limit: overLimit, msg: overMsg}		
	},
	clearStorage: function(){
		storage = {}
	},
	clearRules: function(){
		rules = {}
	}
}
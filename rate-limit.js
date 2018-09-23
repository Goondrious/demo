const type = ["username", "ip"]
const unit = ["hour", "minute", "second", "millisecond"]
const multiplier = [1000*60*60, 1000*60, 1000, 1]
const storageUnit = {
	"expiry": "",
	"created": "",
	"count": 0
}

let storage = {} //storage for counts and expiries
let rules = {} //storage for rules, name => {type: , unit: , expiry:, limit:, warningMsg: , errorMsg: }

const setTimeoutInterval = function(key, rule){
	//remove the key after multiplier*value
	console.log("setting interval!", key)
	console.log(multiplier[unit.indexOf(rule.unit)]*rule.expiry)
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
		//will be array for easier input? Transform it to JSON, with name as key
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
		//assign a limit to an api route
		//provide type, time and value
		//return true if a limit has been reached
		//add support for automatically finding identity, by taking in req as parameter
		let overLimit = false
		let overMsg = ""
		routeRules.map(ruleName=> {
			let thisRule = rules[ruleName]
			//add support for username (depending on where it )
			let key = identity+":"+thisRule.type+":"+route+":"+thisRule.unit
			if(!storage.hasOwnProperty(key)){
				//first instance of this route, so initialize
				console.log("initializing storage for ", key)
				storage[key] = {count: 1}
				console.log(storage[key])
				setTimeoutInterval(key, thisRule)
			} else {
				//check limit and increment
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
	checkLimits: function(){
		//loop over storage object and delete counts that have expired
	},
	clearStorage: function(){
		storage = {}
	},
	clearRules: function(){
		rules = {}
	}
}

//limits object = {}

//unique key of route:type:value
//hash of different frequencies

// by hour
// by minute
// by second
// by millisecond

//variable rates depending on the time of day
//different types of keys (username, ip, both)
//failure message


//loop over all of storage or setTimeout for each individual?
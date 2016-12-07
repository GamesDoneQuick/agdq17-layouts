# agdq17-layouts
The on-stream graphics used during Awesome Games Done Quick 2017.

This is a [NodeCG](http://github.com/nodecg/nodecg) 0.8 bundle. You will need to have NodeCG 0.8 installed to run it.

## Installation
- Install to `nodecg/bundles/agdq17-layouts`.
- Install `bower` if you have not already (`npm install -g bower`)
- **WINDOWS**: Install [`windows-build-tools`](https://www.npmjs.com/package/windows-build-tools) to install the tools necessary to compile `agdq17-layouts`' dependencies.
- **LINUX**: Install `build-essential` and Python 2.7, which are needed to compile `agdq17-layouts`' dependencies.
- `cd nodecg/bundles/agdq17-layouts` and run `npm install --production`, then `bower install`
- Create the configuration file (see the [configuration][id] section below for more details)
- Run the nodecg server: `nodecg start` (or `node index.js` if you don't have nodecg-cli) from the `nodecg` root directory.

Please note that you **must manually run `npm install` for this bundle**. NodeCG currently cannot reliably 
compile this bundle's npm dependencies. This is an issue we hope to address in the future.

## Usage
This bundle is not intended to be used verbatim. Many of the assets have been replaced with placeholders, and
most of the data sources are hardcoded. We are open-sourcing this bundle in hopes that people will use it as a
learning tool and base to build from, rather than just taking and using it wholesale in their own productions.

To reiterate, please don't just download and use this bundle as-is. Build something new from it.

[id]: configuration
## Configuration
To configure this bundle, create and edit `nodecg/cfg/agdq17-layouts.json`.  
Refer to [configschema.json][] for the structure of this file.
[configschema.json]: configschema.json

Example config:
```json
{
	"useMockData": true,
	"displayDuration": 10,
	"osc": {
		"address": "192.168.1.10",
		"gameAudioChannels": [
			{
				"sd": 17,
				"hd": 25
			},
			{
				"sd": 19,
				"hd": 27
			},
			{
				"sd": 21,
				"hd": null
			},
			{
				"sd": 23,
				"hd": null
			}
		]
	},
	"twitter": {
		"userId": "1234",
		"consumerKey": "aaa",
		"consumerSecret": "bbb",
		"accessTokenKey": "ccc",
		"accessTokenSecret": "ddd"
	},
	"streamTitle": "EVENT NAME - ${gameName}",
	"tracker": {
		"username": "username",
		"password": "password"
	}
}
```

## License
agdq17-layouts is provided under the Apache v2 license, which is available to read in the [LICENSE][] file.
[license]: LICENSE

### Credits
Designed & developed by [Support Class](http://supportclass.net/)
 - [Alex "Lange" Van Camp](https://twitter.com/VanCamp/)  
 - [Chris Hanel](https://twitter.com/ChrisHanel)

var SharedLibrary = Class.create();
SharedLibrary.prototype = {
    initialize: function() {
        this.aDebug = [];
        this.bDebug = gs.getProperty('shared.library.debug.active', 'false');
    },

    /**SNDOC
      @name cleanJson
      @description clean values from JSON to ensure valid JSON
      @param {string} [string] - Whaterver string you want clean for JSON
      @return {string} Clean string for JSON
     */
    cleanJson : function(inString) {
        inString = inString + '';
        inString = inString.replace(/\\/g, "\\\\");
        inString = inString.replace(/\n/g, "\\n")
        inString = inString.replace(/\r/g, "\\r")
        inString = inString.replace(/\t/g, "\\t")
        inString = inString.replace(/\f/g, "\\f")
        inString = inString.replace(/"/g,"\\\"")
        inString = inString.replace(/'/g,"\\'")
        inString = inString.replace(/&/g, "\\&"); 
        return 
    },

    /**SNDOC
      @name jsonStringPretty
      @description paste in a JSON object and get a pretty json string back
      @summary For the time you can't be bothered to format stringify
      @param {JSON} [payload] - Whatever JSON object you want to look pretty
      @returns {string}
     */
    jsonStringPretty : function(inPayload) {
        var output = '';
        try {
            output = JSON.stringify(inPayload, null, 4);
        } catch ( err ) {
            output = err.message;
        }
        return output;
    },

    /**SNDOC
      @name jsonStringMinify
      @description paste in a JSON object and get a minified json string back
      @summary seriourly, stop being lazy...
      @param {JSON} [payload] - Whatever JSON object you want as small as you can get...
      @returns {string}
     */
    jsonStringMinify : function(inPayload) {
        var output = '';
        try { 
            output = JSON.stringify(inPayload);
        } catch ( err ) {
            output = err.message;
        }
        return output;
    },

    /**SNDOC
      @name getOauthToken
      @description Get an oauth token with grant type
      @summary Created before this was an option in platform...  seems a waste to throw away now
      @param {JSON} [payload] - The profile to call and whatever params are needed
      @example
      var jPayload = {
        "Profile" : "<sys_id of the app registry to use.  This is required>",
        "Params"  : {"grant_type":"client_credentials","resource":"https://vault.azure.net"}
      };
      var output = getOauthToken(jPayload);
      gs.info('Your token                 : ' + output.AccessToken);
      gs.info('When does it expire        : ' + output.AccessTokenExpiresIn);
      gs.info('When to refresh to token   : ' + output.RefreshToken);
      gs.info('How long did this all take : ' + output.Duration);
      @returns {JSON} Payload with all the required bits
     */
    getOauthToken : function(inObject) {
        var nTimeStart = new Date().getTime();
        this._logMessage('getOauthToken', 'Starting');
        var oToken, oTokenResponse;

        var output = {"AccessToken":"","AccessTokenExpiresIn":"","RefreshToken":"","Message":"","Duration":""};
        var jParams = global.JSUtil.notNil(inObject.Params) ? inObject.Params : {"grant_type":"client_credentials"};

        this._logMessage('getOauthToken', '<< Profile : ' + inObject.Profile);
        this._logMessage('getOauthToken', '<< Params  : ' + JSON.stringify(jParams));

        var oAuthClient   = new sn_auth.GlideOAuthClient();
        try {
            oTokenResponse = oAuthClient.requestToken(inObject.Profile, JSON.stringify(jParams));
            oToken         = oTokenResponse.getToken();
            output.AccessToken          = global.JSUtil.notNil(oToken.getAccessToken())  ? oToken.getAccessToken()  : '';
            output.AccessTokenExpiresIn = global.JSUtil.notNil(oToken.getExpiresIn())    ? oToken.getExpiresIn()    : '';
            output.RefreshToken         = global.JSUtil.notNil(oToken.getRefreshToken()) ? oToken.getRefreshToken() : '';
            output.Message              = 'All good';
        } catch ( err ) {
            output.Message = err.message;
        }
        this._logMessage('getOauthToken', '>> output.AccessToken          : ' + output.AccessToken);
        this._logMessage('getOauthToken', '>> output.AccessTokenExpiresIn : ' + output.AccessTokenExpiresIn);
        this._logMessage('getOauthToken', '>> output.RefreshToken         : ' + output.RefreshToken);
        this._logMessage('getOauthToken', '>> output.Message              : ' + output.Message);
        output.Duration = (new Date().getTime() - nTimeStart);
        this._logMessage('getOauthToken', 'Transaction time     : ' + output.Duration + ' msecs');
        this._logMessage('getOauthToken', 'Stopping');

        return output;
    },

    /**SNDOC
      @name runRestMessage
      @description run any REST call without a defined REST Message...
      @summary I get bored managing REST messages...
      @param {JSON} [payload] - A payload with all required values
      @example
      var jPayload = {
          "ApiRetry"  : <default 3 tries>,
          "ApiSleep"  : <default 5 secs sleep>,
          "Endpoint"  : <full API URI>,
          "Headers"   : {"Content-Type":"application/json","Accept":"application/json"},
          "Method"    : <get | put | post | delete>,
          "MidServer" : <Only required if running command from inside the network>,
          "UniqueID"  : <Needed when using a MID Server.  Links inbound to outbound message>,
          "Payload"   : <JSON payload for the target when using post, put or patch>,
          "QueryParameter" : <[{"name":"sysparm_query"","value":"active=true"}]>,
          "Timeout"   : <default 120 secs>,
          "LogLevel"  : <The log level. Valid values are basic, elevated, and all>,
          "Authentication" : One of these only
            { "BasicAuth" : {"Pswd":"","User":""} },
            { "MutualAuth"  : "Profile name" },
            { "AuthProfile" : {"type":"basic|oauth2","profileId":"<sys_id>"} }
      };
      var output = runRestMessage(jPayload);
      @returns {JSON} Defined payload for REST output
     */
    runRestMessage : function(inObject) {
        var nTimeStart = new Date().getTime();
        this._logMessage('runRestMessage', 'Starting');
        /*
         * setup all the required output params
         */
        var oResponse, nResponseCode = 500, sResponseBody = {}, sResponseError = {}, sRequestBody = {}, sResponseEndpoint = '', sResponseHeaders = '', aResponseHeaders = [], sRequestHeaders = '';
        /*
         * manage the some default params we need and may not get
         */
        if ( global.JSUtil.nil(inObject.Method)    ) { inObject.Method    = 'get'; }
        if ( global.JSUtil.nil(inObject.Timeout)   ) { inObject.Timeout   = 120000; }
        if ( global.JSUtil.nil(inObject.ApiSleep)  ) { inObject.ApiSleep  = 5000; }
        if ( global.JSUtil.nil(inObject.ApiRetry)  ) { inObject.ApiRetry  = 3; }
        if ( global.JSUtil.nil(inObject.MidServer) ) { inObject.MidServer = ''; }
        if ( global.JSUtil.nil(inObject.Headers)   ) { inObject.Headers   = {"Content-Type":"application/json","Accept":"application/json"}; }
        if ( global.JSUtil.nil(inObject.LogLevel)  ) { inObject.LogLevel  = 'basic'; } else { inObject.LogLevel = this._validTokens(inObject.LogLevel, 'basic', 'basic,elevated,all'); }

        this._logMessage('runRestMessage', '<-- Endpoint       : ' + inObject.Endpoint);
        this._logMessage('runRestMessage', '<-- Method         : ' + inObject.Method);
        this._logMessage('runRestMessage', '<-- Payload        : ' + inObject.Payload);
        this._logMessage('runRestMessage', '<-- Timeout        : ' + inObject.Timeout);
        this._logMessage('runRestMessage', '<-- MID Server     : ' + inObject.MidServer);
        this._logMessage('runRestMessage', '<-- Unique ID      : ' + inObject.UniqueID);
        this._logMessage('runRestMessage', '<-- Log Level      : ' + inObject.LogLevel);
        this._logMessage('runRestMessage', '<-- Headers        : ' + global.JSON.stringify(inObject.Headers));
        this._logMessage('runRestMessage', '<-- QueryParameter : ' + global.JSON.stringify(inObject.QueryParameter));
        this._logMessage('runRestMessage', '<-- ApiSleep       : ' + inObject.ApiSleep);
        this._logMessage('runRestMessage', '<-- API Retry      : ' + inObject.ApiRetry);

        if ( global.JSUtil.notNil(inObject.Endpoint) ) {
            var rest = new sn_ws.RESTMessageV2();
            rest.setHttpMethod(inObject.Method);
            rest.setHttpTimeout(inObject.Timeout);
            rest.setEccParameter('skip_sensor', true);
            rest.setEndpoint(inObject.Endpoint);
            rest.waitForResponse(inObject.Timeout);
            rest.setLogLevel(inObject.LogLevel);

            if ( global.JSUtil.notNil(inObject.BasicAuth.User) ) {
                /*
                 * Deal with basic auth requests
                 */
                rest.setBasicAuth(inObject.BasicAuth.User, inObject.BasicAuth.Pswd);
                this._logMessage('runRestMessage', '<-- BasicAuth.User  : ' + inObject.BasicAuth.User);
                this._logMessage('runRestMessage', '<-- BasicAuth.Pswd  : ' + inObject.BasicAuth.Pswd);
            } else if ( global.JSUtil.notNil(inObject.MutualAuth) ) {
                /*
                 * painfull, but considered for mutual auth...
                 */
                rest.setMutualAuth(inObject.MutualAuth);
                this._logMessage('runRestMessage', '<-- MutualAuth  : ' + inObject.MutualAuth);
            } else if (global.JSUtil.notNil(inObject.AuthProfile) ) {
                /*
                 * Use a defined auth profile
                 */
                rest.setAuthenticationProfile(inObject.AuthProfile.type.toString(), inObject.AuthProfile.profileId.toString());
            }

            /*
             * process all the headers we're asked to add...
             */
            if ( global.JSUtil.notNil(inObject.Headers) ) {
                for ( var key in inObject.Headers ) {
                    rest.setRequestHeader(key, inObject.Headers[key]);
                }
            }

            /*
             * now some query params
             */
            if ( global.JSUtil.notNil(inObject.QueryParameter) ) {
                for ( var n = 0; n < inObject.QueryParameter.length; n++ ) {
                    rest.setQueryParameter(inObject.QueryParameter[n].name.toString(), inObject.QueryParameter[n].value.toString());
                }
            }
            /*
             * If you added a payload it will go here
             */
            if ( global.JSUtil.notNil(inObject.Payload) ) { rest.setRequestBody(inObject.Payload); }
            /*
             * do the needful to use an internal API
             */
            if ( global.JSUtil.notNil(inObject.MidServer) ) {
                rest.setMIDServer(inObject.MidServer);
                if ( global.JSUtil.nil(inObject.UniqueID) ) { inObject.UniqueID = gs.generateGUID(); }
                rest.setEccCorrelator(inObject.UniqueID);
            }
            for ( var i = 1; i <= parseInt(inObject.ApiRetry); i++ ) {
                this._logMessage('runRestMessage', 'Running try ' + i + ' of ' + inObject.ApiRetry);
                try {
                    oResponse = rest.execute();
                    if ( global.JSUtil.notNil(inObject.MidServer) ) { rest.waitForResponse(60); }
                    nResponseCode     = oResponse.getStatusCode();
                    sResponseBody     = oResponse.getBody();
                    sResponseError    = oResponse.haveError() ? oResponse.getErrorMessage() : '';
                    aResponseHeaders  = oResponse.getHeaders();
                    sResponseEndpoint = oResponse.getEndpoint();
                    sRequestHeaders   = oResponse.getRequestHeaders();
                } catch( err ) {
                    this._logMessage('runRestMessage', 'Caught in catch : ' + err);
                    sResponseBody    = 'Error Code : ' + err.getErrorCode() + '\nMessage : ' + err.getMessage() + '\nError Message : ' + err.getErrorMessage();
                    aResponseHeaders = oResponse.getHeaders();
                } finally {
                    sRequestBody = rest ? rest.getRequestBody():null;
                    for ( var j = 0; j < aResponseHeaders.length; j++ ) { sResponseHeaders += aResponseHeaders[j] + ''; }
                }
                if ( parseInt(nResponseCode) > 0 ) { break; } else { gs.sleep(parseInt(inObject.ApiSleep)); }
            }
        }
        this._logMessage('runRestMessage', '--> ResponseCode     : ' + nResponseCode);
        this._logMessage('runRestMessage', '--> ResponseEndpoint : ' + sResponseEndpoint);
        this._logMessage('runRestMessage', '--> ResponseHeaders  : ' + sResponseHeaders);
        this._logMessage('runRestMessage', '--> RequestHeaders   : ' + sRequestHeaders);
        var nTimeDuration = (new Date().getTime() - nTimeStart);
        this._logMessage('runRestMessage', 'Transaction time     : ' + nTimeDuration + ' msecs');
        this._logMessage('runRestMessage', 'Stopping');
        
        return {"ResponseCode":nResponseCode,"ResponseBody":sResponseBody,"ResponseError":sResponseError,"RequestBody":sRequestBody,"ResponseEndpoint":sResponseEndpoint, "ResponseHeaders":sResponseHeaders,"RequestHeaders":sRequestHeaders,"TransactionTime":nTimeDuration};
    },

    /**SNDOC
      @name _validTokens
      @description check if this is a valid token to process
      @private
     *******************************************************************/
    _validTokens : function(inValue, inDefault, inToken) {
        var output = inDefault;
        var aToken = inToken.split(',');
        for ( var i = 0; i < inToken.length; i++ ) {
            if ( inValue.toLowerCase() == aToken[i].toString() ) {
                output = aToken[i].toString();
            }
        }
        return output;
    },

    /**SNDOC
      @name _logMessage
      @description I need my debug!  I just don't like wasting memory all the time...
      @private
     */
    _logMessage : function(inFunction, inString) {
        if ( this.bDebug == 'true' ) {
            this.aDebug.push('[' + Date.now() + '][' + inFunction + '] : ' + inString);
        }
    },

    type: 'SharedLibrary'
};

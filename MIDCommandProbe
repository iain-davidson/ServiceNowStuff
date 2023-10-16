/*
 * Original concept came from Mahendra Reddy
 */
var MIDCommandProbe = Class.create();
MIDCommandProbe.prototype = {
    initialize: function() {
        this.aDebug = [];
        this.bDebug = gs.getProperty('mid.command_probe.debug.active', 'false');
        this.sDebug = gs.getProperty('mid.command_probe.debug.source', 'MIDCommandProbe');
    },

    /**SNDOC
      @name postMIDCommandProbe
      @example
	   //*command     : defaults to dir
       //*mid_server  : name of the mid server to address
       //*ecc         : {"name":name of the ecc record,"source": name of the ecc source}
       // probe       : {"id":defaults to '',"name":defaults to '':
       // from_sys_id : defaults to ''
       // max_time    : defaults to 120000
      var jPayload = {
          "command"     : "dir",
          "mid_server"  : "<server>",
          "ecc"         : {"name":"<ecc name>","source":"<ecc source>"},
          "probe"       : {"id":"","name":""},
          "from_sys_id" : "",
          "max_time"    : 120000
      };
      var jOutput = postMIDCommandProbe(jPayload);
      gs.info(oResponse.output);
      gs.info(oResponse.error);
     */
    postMIDCommandProbe : function(inPayload) {
        this._logMessage('postMIDCommandProbe', 'Starting');

        var sCommand   = JSUtil.notNil(inPayload.command)     ? inPayload.command     : 'dir';
        var sProbeId   = JSUtil.notNil(inPayload.probe.id)    ? inPayload.probe.id    : '';
        var sProbeName = JSUtil.notNil(inPayload.probe.name)  ? inPayload.probe.name  : '';
        var sFromSysId = JSUtil.notNil(inPayload.from_sys_id) ? inPayload.from_sys_id : '';
        var sEccName   = JSUtil.notNil(inPayload.ecc.name)    ? inPayload.ecc.name    : 'ECC Test message';
        var sEccSource = JSUtil.notNIl(inPayload.ecc.source)  ? inPayload.ecc.source  : sEccName;
        var sMidServer = JSUtil.notNil(inPayload.mid_server)  ? inPayload.mid_server  : '';
        var nMaxTime   = JSUtil.notNil(inPayload.max_time)    ? inPayload.max_time    : 120000;

        var oPayload   = this._buildMIDPayload(sCommand, sProbeId, sProbeName);

        this._logMessage('postMIDCommandProbe', 'From Sys ID : ' + sFromSysId);
        this._logMessage('postMIDCommandProbe', 'Agent       : ' + 'mid.server.' + sMidServer);
        this._logMessage('postMIDCommandProbe', 'Topic       : Command');
        this._logMessage('postMIDCommandProbe', 'Name        : ' + sEccName);
        this._logMessage('postMIDCommandProbe', 'Source      : ' + sEccSource);
        this._logMessage('postMIDCommandProbe', 'Queue       : output');
        this._logMessage('postMIDCommandProbe', 'State       : ready');
        this._logMessage('postMIDCommandProbe', 'Payload     : ' + oPayload);

        if ( JSUtil.notNil(sMidServer) ) {
            var glider = new GlideRecord('ecc_queue');
            glider.initialize();
            glider.from_sys_id = sFromSysId;
            glider.agent       = 'mid.server.' + inPayload.mid_server;
            glider.topic       = 'Command';
            glider.name        = sEccName;
            glider.source      = sEccSource;
            glider.queue       = 'output';
            glider.state       = 'ready';
            glider.payload     = oPayload;
            var sSysId = glider.insert();
            this._logMessage('postMIDCommandProbe', 'Processing  : ' + sSysId);

            var oResponse = this._getMIDResponse(sSysId, nMaxTime);
            this._logMessage('postMIDCommandProbe', 'Output      : ' + oResponse.output);
            this._logMessage('postMIDCommandProbe', 'Error       : ' + oResponse.error);
            this._logMessage('postMIDCommandProbe', 'Stopping');
        } else {
            this._logMessage('postMIDCommandProbe', '<<ERROR>> No MID Server supplied');
        }

        this._logMessage('postMIDCommandProbe', 'Stopping');
        return oResponse;
    },

    /**SNDOC
	  @name _buildMIDPayload
	  @private
	 */
	_buildMIDPayload : function(inCommand, inProbeId, inProbeName) {
        var elName, elProbeId, elProbeName, elDiscovery, elSensor;

        var xmldoc = new XMLDocument("<parameters/>");
        elName   = xmldoc.createElement("parameter");
        elSensor = xmldoc.createElement("parameter");
        if ( JSUtil.notNil(inProbeId) ) {
            elProbeId   = xmldoc.createElement("parameter");
            elProbeName = xmldoc.createElement("parameter");
            elDiscovery = xmldoc.createElement("parameter");
        }
        xmldoc.setCurrent(elName); xmldoc.setAttribute("name", "name"); xmldoc.setAttribute("value", inCommand);
        xmldoc.setCurrent(elSensor); xmldoc.setAttribute("name", "skip_sensor"); xmldoc.setAttribute("value", "true");
        if ( JSUtil.notNil(inProbeId) ) {
            xmldoc.setCurrent(elProbeId); xmldoc.setAttribute("name", "probe"); xmldoc.setAttribute("value", inProbeId);
            xmldoc.setCurrent(elProbeName); xmldoc.setAttribute("name", "probe_name"); xmldoc.setAttribute("value", inProbeName);
            xmldoc.setCurrent(elDiscovery); xmldoc.setAttribute("name", "used_by_discovery"); xmldoc.setAttribute("value", "true");
        }
        this._logMessage('_buildMIDPayload', 'Payload : ' + xmldoc.toString());
        return xmldoc.toString();
    },

    /**SNDOC
	  @name _getMIDResponse
	  @private
	 */
	_getMIDResponse : function(inSysID, inMaxTime) {
        var nCounter = 0, bComplete = false, oOutput = {};

        var glider = new GlideRecord('ecc_queue');
        glider.addEncodedQuery('queue=input^response_to=' + inSysID);
        while ( ( nCounter < inMaxTime ) && ( bComplete == false ) ) {
            this._logMessage('_getMIDResponse', 'Data Loop : ' + nCounter + ' of ' + inMaxTime);
            glider.query();
            if ( glider.next() ) {
                this._logMessage('_getMIDResponse', 'Got it, updating record');
                bComplete = true;

                glider.state = 'processed';
                glider.processed = new GlideDateTime();
                glider.update();
            }
            gs.sleep(1000);
            nCounter++;
        }
        var oPayload = this._getMIDECCPayload(glider);
        this._logMessage('_getMIDResponse', 'Payload : ' + oPayload);
        var xmldoc = new XMLDocument(oPayload);
        if ( bComplete == true ) {
            oOutput.output = '' + this._getXMLValue(xmldoc, '//results/result/stdout');
            oOutput.error  = '' + this._getXMLValue(xmldoc, '//results/result/stderr');
        }
        this._logMessage('_getMIDResponse', 'Output  : ' + oOutput.output);
        this._logMessage('_getMIDResponse', 'Error   : ' + oOutput.error);

        return oOutput;
    },

    /**SNDOC
	  @name _getMIDECCPayload
	  @private
	 */
	_getMIDECCPayload : function(inEccRecord) {
        var payload;
        if ( inEccRecord.payload != '<see_attachment/>' ) {
            this._logMessage('_getMIDECCPayload', 'Reading payload content');
            payload = inEccRecord.payload;
        } else {
            this._logMessage('_getMIDECCPayload', 'Reading attachment payload');
            var sa = new GlideSysAttachment();
            payload = sa.get(inEccRecord, 'payload');
        }
        this._logMessage('_getMIDECCPayload', 'Payload : ' + payload);
        return payload;
    },

    /**SNDOC
	  @name _getXMLValue
	  @private
	 */
	_getXMLValue : function(inXMLDoc, inPath) {
        this._logMessage('_getXMLValue', 'XML Document : ' + inXMLDoc);
        this._logMessage('_getXMLValue', 'Query Path   : ' + inPath);
        var output = inXMLDoc.getNodeText(inPath);
        this._logMessage('_getXMLValue', 'Output : ' + output);
        return output;
    },

    /**SNDOC
	  @name _logMessage
	  @private
	 */
	_logMessage : function(inFunction, inMessage) {
        if ( this.bDebug == 'true' ) {
            this.aDebug.push('[' + Date.now() + '][' + inFunction + '] : ' + inMessage);
        }
    },

    type: 'MIDCommandProbe'
};

var GitPayloadUtil = Class.create();
GitPayloadUtil.prototype = {
    initialize: function() {
        this.evil = new GlideScopedEvaluator();
    },

    /**SNDOC
      @name runGitPayloadGenerator
      @description 
      @param {string} [sys_id] - The sys_id of the scriptlet you want to run
      @param {GlideRecord} [ritm] - The RITM to interact with
      @param {GlideRecord} [sctask] - The SCTASK to interact with
      @return {string} A JSON string for user as desired
     */
    runGitPayloadGenerator : function(scriptlet, parent, child) {
        var output = '';
        var script = new GlideRecord('sys_scriptlet_function');
        if ( script.get(scriptlet) ) {
            this.evil.putVariable('parent', parent);
            this.evil.putVariable('child',  child);
            this.evil.putVariable('answer', '');

            this.evil.evaluateScript(script, 'script', null);

            output = this.evil.getVariable('answer');
        }
        return output;
    },

    /**SNDOC
      @name taskLookup
      @return {string} sys_id of the matching record
     */
    taskLookup : function(inFilterString) {
        var output = '';
        var glider = new GlideRecord('sc_task');
        glider.setLimit(1);
        glider.addEncodedQuery(inFilterString);
        glider.query();
        while ( glider.next() ) { output = glider.getValue('sys_id'); }
        return output;
    },

    type: 'GitPayloadUtil'
};

/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*jslint sub: true*/
//#include aura.component.Component_private


/**
 * Construct a new Component.
 * @public
 * @class
 * @constructor
 *
 * @param {Object} config - component configuration
 * @param {Boolean} [localCreation] - local creation
 * @param {ComponentCreationContext} [componentCreationContext] - ccc used to create component
 */
function Component(config, localCreation, componentCreationContext) {
    this.ccc = componentCreationContext;
    this.priv = new ComponentPriv(config, this, localCreation);
    this._destroying = false;

    //#if {"modes" : ["TESTING","AUTOTESTING", "TESTINGDEBUG", "AUTOTESTINGDEBUG"]}
    this["creationPath"] = this.priv.creationPath;
    //#end
}

/**
 * The Component type.
 * <p>Examples:</p>
 * <p><code>//Checks if the component value is of this type<br />obj.auraType === "Component"</code></p>
 * <p><code>//Checks if the elements in the body is of this type<br />
 * var body = cmp.get("v.body");<br />
 * var child = body[i];<br />
 * if (child.auraType === "Component") { //do something }
 * </code></p>
 * @public
 */
Component.prototype.auraType = "Component";

/**
 * Gets the ComponentDef
 * Shorthand: <code>get("def")</code>
 * @public
 */
Component.prototype.getDef = function() {
    return this.priv.componentDef;
};

/**
 * Indexes the given <code>globalId</code> based on the given <code>localId</code>.
 * Allows <code>cmp.find(localId)</code> to look up the given <code>globalId</code>, look up the component, and return it.
 * @param {String} localId The id set using the aura:id attribute.
 * @param {String} globalId The globally unique id which is generated on pageload.
 * @protected
 */
Component.prototype.index = function(localId, globalId){
    var priv = this.priv;
    if (priv.delegateValueProvider){
        return priv.delegateValueProvider.index(localId, globalId);
    }

    var index = priv.index;
    if(!index){
        index = {};
        priv.index = index;
    }

    var existing = index[localId];
    if (existing){
        if(!$A.util.isArray(existing)){
            index[localId] = [existing, globalId];
        }else{
            existing.push(globalId);
        }
    }else{
        index[localId] = globalId;
    }
    return null;
};

/**
 * Removes data from the index. If both <code>globalId</code> and <code>localId</code> are provided, only the given pair is removed from the index.
 * If only <code>localId</code> is provided, every mapping for that <code>localId</code> is removed from the index.
 *
 * This might be called after component destroy in some corner cases, be careful to check for priv before
 * accessing.
 *
 * @param {String} localId The id set using the aura:id attribute.
 * @param {String} globalId The globally unique id which is generated on pageload.
 * @protected
 */
Component.prototype.deIndex = function(localId, globalId){
    var priv = this.priv;

    //
    // Unfortunately, there are some bizarre loops with deIndex and destroy.
    // For the moment, we don't enforce that this is a valid component until
    // we can track down _why_ it is being called on already destroyed components
    if (!this.priv) {
        return null;
    }

    if(priv.delegateValueProvider){
        return priv.delegateValueProvider.deIndex(localId, globalId);
    }

    if (priv.index) {
        if(globalId){
            var index = priv.index[localId];
            if(index){
                if($A.util.isArray(index)){
                    for(var i=0;i<index.length;i++){
                        if(index[i] === globalId){
                            index.splice(i, 1);
                            //
                            // If we have removed an index, we need to back up
                            // our counter to process the same index.
                            //
                            i -= 1;
                        }
                    }
                    if(index.length === 0){
                        delete priv.index[localId];
                    }
                }else{
                    if(index === globalId){
                        delete priv.index[localId];
                    }
                }
            }
        }else{
            delete priv.index[localId];
        }
    }
    return null;
};

/**
 * Locates a component using the localId. Shorthand: <code>get("asdf")</code>, where "asdf" is the <code>aura:id</code> of the component to look for.
 * See <a href="#help?topic=findById">Finding Components by ID</a> for more information.
 * Returns instances of a component using the format <code>cmp.find({ instancesOf : "auradocs:sampleComponent" })</code>.
 * @param {String|Object} name If name is an object, return instances of it. Otherwise, finds a component using its index.
 * @public
 */
Component.prototype.find = function(name){
    if($A.util.isObject(name)){
        var type = name["instancesOf"];
        var instances = [];
        this.findInstancesOf(type, instances, this);
        return instances;
    }
    var index = this.priv.index;
    if(index){
        var globalId = index[name];
        if(globalId){
            if($A.util.isArray(globalId)){
                var ret = [];
                for(var i=0;i<globalId.length;i++){
                    ret.push(componentService.get(globalId[i]));
                }
                return ret;
            }
            return componentService.get(globalId);
        }
    }
    if (this.priv.delegateValueProvider){
        return this.priv.delegateValueProvider.find(name);
    }
    //
    // For non-existent objects, we return undefined so that
    // we can distinguish between not existing and null.
    //
    return undefined;
};

/**
 * Finds attribute values given its component name. Returns the value.
 * @param {Object|String} name
 * @private
 */
Component.prototype.findValue = function(name){
    var zuper = this;
    while(zuper){
        var value = zuper._getAttributes()._getValue(name, true);
        if(value){
            if(value.isDefined){
                if(value.isDefined()){
                    return value;
                }
            } else {
                return value;
            }
        }
        zuper = zuper.getSuper();
    }
    return null;
};

/**
 * Returns the Component instance. For example, <code>component.unwrap()</code>.
 */
Component.prototype.unwrap = function() {
    return this;
};

/**
 * Find instances of a Component type, in this component's hierarchy, and in it's body, recursively.
 * @param {Object} type The object type.
 * @param {Array} ret The array of instances to add the located Components to.
 * @param {Object} cmp The component to search for.
 * @private
 */
Component.prototype.findInstancesOf = function(type, ret, cmp){
    cmp = cmp || this.getSuperest();

    var body = cmp.get("v.body");
    if(body){
        for(var i=0;i<body.length;i++){
            cmp = body[i];
            if (cmp.findInstanceOf) {
                var inst = cmp.findInstanceOf(type);
                if(inst){
                    ret.push(inst);
                }else{
                    cmp.findInstancesOf(type, ret);
                }
            }
        }
    }
};

/**
 * @private
 */
Component.prototype.getSuperest = function(){
    var zuper = this.getSuper();
    if(zuper){
        var zuperer = zuper.getSuperest();
        if(zuperer){
            return zuperer;
        }
        return zuper;
    }else{
        return this;
    }
};

/**
 *
 * @private
 */
Component.prototype.findInstanceOf = function(type){
    var descriptor = this.getDef().getDescriptor();
    if((descriptor.getNamespace()+":"+descriptor.getName()) === type){
        return this;
    }else{
        var zuper = this.getSuper();
        if(zuper){
            return zuper.findInstanceOf(type);
        }else{
            return null;
        }
    }
};

/**
 * Checks whether the component is an instance of the given component name (or interface name).
 * @param {String} name The name of the component (or interface), with a format of <code>namespace:componentName</code>.
 * @returns {Boolean} true if the component is an instance, or false otherwise.
 */
Component.prototype.isInstanceOf = function(name){
    return this.getDef().isInstanceOf(name);
};

/**
 * @private
 * @param {Object} type Applies the type to its definition.
 */
Component.prototype.implementsDirectly = function(type){
    return this.getDef().implementsDirectly(type);
};

/**
 * Adds an event handler. Resolving the handler Action happens at Event-handling time, so the Action reference may be altered at runtime,
 * and that change is reflected in the handler. See <a href="#help?topic=dynamicHandler">Dynamically Adding Event Handlers</a> for more information.
 * @param {String} eventName The event name
 * @param {Object} valueProvider The value provider to use for resolving the actionExpression.
 * @param {Object} actionExpression The expression to use for resolving the handler Action against the given valueProvider.
 * @param {boolean} insert The flag to indicate if we should put the handler at the beginning instead of the end of handlers array.
 * @public
 */
Component.prototype.addHandler = function(eventName, valueProvider, actionExpression, insert){
    var dispatcher = this.priv.getEventDispatcher(this);

    var handlers = dispatcher[eventName];
    if (!handlers){
        handlers = [];
        dispatcher[eventName] = handlers;
    }

    if (insert === true) {
        handlers.unshift(this.priv.getActionCaller(valueProvider, actionExpression));
    } else {
        handlers.push(this.priv.getActionCaller(valueProvider, actionExpression));
    }
};

/**
 * Adds handlers to Values owned by the Component.
 * @param {Object} config Passes in the value, event (e.g. "change"), and action (e.g. "c.myAction").
 * @public
 */
Component.prototype.addValueHandler = function(config){
    var value = config["value"];
    if($A.util.isString(value) || value.toString() === "PropertyReferenceValue"){
        value = this._getValue(value);
    }

    if(value){
        if(value === this){
            //FIXME = ideally addHandler on Components and other values should have the same shape and behavior.
            var eventQName = BaseValue.getEventDef(config["event"], true).getDescriptor().getQualifiedName();
            this.addHandler(eventQName, this, config["action"]);
        }else{

            var valueConfig = {};
            valueConfig["globalId"] = this.getGlobalId();
            valueConfig["eventName"] = config["event"];
            valueConfig["valueProvider"] = this;
            valueConfig["actionExpression"] = config["action"];
            valueConfig["method"] = config ["method"];

            value.addHandler(valueConfig);
            var priv = this.priv;
            var valuesWithHandlers = priv.valuesWithHandlers;
            if(!valuesWithHandlers){
                valuesWithHandlers = [];
            }
            valuesWithHandlers.push(value);
        }
    }
};

/**
 * Add a document level event handler that auto-cleans.
 *
 * When called, this will create and return a handler that can be enabled and disabled at
 * will, and will be cleaned up on destroy.
 *
 * @public
 * @param {String} eventName the event name to attach.
 * @param {Function} callback the callback (only called when enabled, and component is valid & rendered)
 * @param {Boolean} autoEnable (truthy) enable the handler when created.
 * @return {Object} an object with a single visible call of setEnabled(Boolean)
 */
Component.prototype.addDocumentLevelHandler = function(eventName, callback, autoEnable) {
    var dlh = new $A.ns.DocLevelHandler(eventName, callback, this);
    if (!this.priv.docLevelHandlers) {
        this.priv.docLevelHandlers = {};
    }
    $A.assert(this.priv.docLevelHandlers[eventName] === undefined, "Same doc level event set twice");
    this.priv.docLevelHandlers[eventName] = dlh;
    dlh.setEnabled(autoEnable);
    return dlh;
};

/**
 * Remove a document level handler.
 *
 * You need only call this if the document level handler should be destroyed, it is
 * not generally needed.
 *
 * @public
 * @param {Object} the object returned by addDocumentHandler.
 */
Component.prototype.removeDocumentLevelHandler = function(dlh) {
    if (dlh && dlh.setEnabled) {
        dlh.setEnabled(false);
        this.priv.docLevelHandlers[dlh.eventName] = undefined;
    }
};

/**
 * Forces the final destroy of a component (after async).
 */
Component.prototype.finishDestroy = function(){
    this.destroy(false);
};

/**
 * Destroys the component and cleans up memory.
 *
 * <code>destroy()</code> destroys the component immediately while <code>destroy(true)</code> destroys it asychronously.
 * See <a href="#help?topic=dynamicCmp"/>Dynamically Creating Components</a> for more information.
 * <p>
 * Note that when this is called with async = true, it makes a specific race
 * condition (i.e. calling functions after destroy) harder to trigger. this
 * means that we really would like to be able to for synchronous behaviour here,
 * or do something to make the destroy function appear much more like it is
 * doing a synchronous destroy (e.g. removing this.priv). Unfortunately, the
 * act of doing an asynchronous destroy creates false 'races' because it leaves
 * all of the events wired up.</p>
 *
 * @param {Boolean} async Set to true if component should be destroyed asychronously. The default value is true.
 * @public
 */
Component.prototype.destroy = function(async,value){
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; DESTROY SHOULD BE CONSIDERED IMPLICIT ON ARRAYVALUE/FACET .set()
    if(value){
        var attribute=this._getValue(value);
        attribute.destroy();
        return;
    }
    var i;

    //#if {"modes" : ["TESTING", "TESTINGDEBUG", "AUTOTESTING", "AUTOTESTINGDEBUG"]}
	async = false; // Force synchronous destroy when in testing modes
	//#end

    if (this.priv && !this._destroying){
    	// DCHASMAN TODO W-1879487 Reverted in 188 because of hard to diagnose rerendering weirdness in a couple of tests and one:'s mru/lists view
    	// Default to async destroy
        /*if (async === undefined) {
        	async = true;
        }*/

        var key;

        if (this.priv.docLevelHandlers !== undefined) {
            for (key in this.priv.docLevelHandlers) {
                var dlh = this.priv.docLevelHandlers[key];
                if (dlh && dlh.setEnabled) {
                    dlh.setEnabled(false);
                }
            }
        }

        if (async) {
        	this._scheduledForAsyncDestruction = true;

            for (key in this.priv.elements){
                var element = this.priv.elements[key];
                if (element && element.style) {
                    element.style.display = "none";
                }
            }

            $A.util.destroyAsync(this);

            return null;
        }

        var priv = this.priv;

        this._destroying = true;

        var componentDef = this.getDef();
        var zuper = this.getSuper();

        var globalId = priv.globalId;

        $A.renderingService.unrender(this);

        // Track some useful debugging information for InvalidComponent's use
        //#if {"excludeModes" : ["PRODUCTION"]}
        this._globalId = globalId;
        this._componentDef = componentDef;
        //#end

        // Swap in InvalidComponent prototype to keep us from having to add validity checks all over the place
        $A.util.apply(this, InvalidComponent.prototype, true);

        priv.elements = undefined;

        priv.deIndex();
        $A.componentService.deIndex(globalId);

        var vp = priv.valueProviders;
        if (vp) {
            for (var k in vp) {
                var v = vp[k];
                if (v) {
                    if (v.destroy && aura.util.isFunction(v.destroy)) {
                        v.destroy(async);
                    }

                    delete vp[k];
                }
            }
        }

        if (priv.attributes) {
            priv.attributes.destroy(async);
        }

        if (priv.model) {
            priv.model.destroy(async);
        }

        var ar = priv.actionRefs;
        if (ar) {
            for (k in ar) {
                ar[k].destroy(async);
            }
        }

        if (componentDef) {
            var handlerDefs = componentDef.getAppHandlerDefs();
            if (handlerDefs){
                for (i = 0; i < handlerDefs.length; i++) {
                    var handlerDef = handlerDefs[i];
                    var handlerConfig = {};
                    handlerConfig["globalId"] = globalId;
                    handlerConfig["event"] = handlerDef["eventDef"].getDescriptor().getQualifiedName();
                    $A.eventService.removeHandler(handlerConfig);
                }
            }
        }

        if (zuper){
            zuper.destroy(async);
            priv.superComponent = undefined;
        }

        priv.model = undefined;
        priv.attributes = undefined;
        priv.valueProviders = undefined;
        priv.delegateValueProvider = undefined;
        priv.renderer = undefined;
        priv.actionRefs = undefined;

        var eventDispatcher = priv.getEventDispatcher();
        if (eventDispatcher) {
            for (key in eventDispatcher){
                var vals = eventDispatcher[key];
                if(vals){
                    for(var j=0;j<vals.length;j++){
                        delete vals[j];
                    }

                    delete eventDispatcher[key];
                }
            }
        }

        var valuesWithHandlers = priv.valuesWithHandlers;
        if (valuesWithHandlers){
            for(var m = 0; m < valuesWithHandlers.length; m++){
                valuesWithHandlers[m].destroyHandlers(globalId);
            }
        }

        this._destroying = false;
        priv.valuesWithHandlers = undefined;
        priv.eventDispatcher = undefined;
        priv.index = undefined;
        priv.componentDef = undefined;
        this.priv = undefined;
        return globalId;
    }

    return null;
};

/**
 * Returns true if this component has been rendered and valid.
 * @protected
 */
Component.prototype.isRenderedAndValid = function() {
    return this.priv && !this._destroying && this.priv.rendered;
};

/**
 * Render this component
 * @protected
 */
Component.prototype.render = function() {
	var renderer = this.priv.renderer;
	return renderer.def.render(renderer.renderable) || [];
};

/**
 * Returns true if this component has been rendered but not unrendered
 * (does not necessarily mean component is in the dom tree).
 * @protected
 */
Component.prototype.isRendered = function() {
    return this.priv.rendered;
};

/**
 * Returns true if this component has been rendered but not unrendered
 * (does not necessarily mean component is in the dom tree).
 * @private
 */
Component.prototype.setUnrendering = function(unrendering) {
    this.priv.inUnrender = unrendering;
};


/**
 * Returns true if this component has been rendered but not unrendered
 * (does not necessarily mean component is in the dom tree).
 * @private
 */
Component.prototype.isUnrendering = function() {
    return this.priv.inUnrender;
};

/**
 * Sets the rendered flag.
 * @param {Boolean} rendered Set to true if component is rendered, or false otherwise.
 * @protected
 */
Component.prototype.setRendered = function(rendered) {
    this.priv.rendered = rendered;
};

/**
 * Returns the renderer instance for this component.
 * @protected
 */
Component.prototype.getRenderer = function() {
    return this.priv.renderer;
};

/**
 * Gets the globalId.  This is the generated globally unique id of the component.
 * It can be used to locate the instance later, but will change across pageloads.
 * @public
 */
Component.prototype.getGlobalId = function() {
    return this.priv.globalId;
};

/**
 * Get the id set using the <code>aura:id</code> attribute.  Can be passed into <code>find()</code> on the parent
 * to locate this child.
 * @public
 */
Component.prototype.getLocalId = function() {
    return this.priv.localId;
};

/**
 * If the server provided a rendering of this component, return it.
 * @public
 */
Component.prototype.getRendering = function(){
    var concrete = this.getConcreteComponent();

    if(this !== concrete){
        return concrete.getRendering();
    }else{
        return this.priv.rendering;
    }
};

/**
 * Returns the super component.
 * @protected
 */
Component.prototype.getSuper = function(){
    return this.priv.superComponent;
};

/*jslint sub: true */
/**
 * Associates a rendered element with the component that rendered it for later lookup.
 * Also adds the rendering component's global Id as an attribute to the rendered element.
 * Primarily called by RenderingService.
 * @param {Object} config
 * @protected
 */
Component.prototype.associateElement = function(config){
    if (!this.isConcrete()){
        var concrete = this.getConcreteComponent();
        concrete.associateElement(config);
    } else {
        var priv = this.priv;
        if (!priv.elements){
            priv.elements = {};
        }

        priv.elements[config["name"]] = config["element"];
        priv.associateRenderedBy(this, config["element"]);
    }
};

/**
 * Returns a map of the elements previously rendered by this component.
 * @public
 */
Component.prototype.getElements = function(){
    if (!this.isConcrete()){
        var concrete = this.getConcreteComponent();
        return concrete.getElements();
    } else{
        return this.priv.elements;
    }
};

/**
 * If the component only rendered a single element, return it.
 * Otherwise, you should use <code>getElements()</code>.
 * @public
 */
Component.prototype.getElement = function(){
    var elements = this.getElements();
    if (elements) {
        var ret = elements["element"];
        if (ret && ret.nodeType !== 8/*COMMENT*/){
            return ret;
        }

        // DCHASMAN TODO This smells - makes the assumption that there is the stringized array style of association (e.g. produced by AuraRenderingService) but
        // there are renderers that only produce named element associations where this is going to fail in a bad way (going to be "blind" to those)
        // seems like this should be doing property name iteration instead!

        // Find the first non-comment node
        // setting ret to something not undefined to start loop conditionals
        ret = true;
        for (var i = 0; ret; i++){
            ret = elements[i];
            if (ret && ret.nodeType !== 8/*COMMENT*/) {
                return ret;
            }
        }
    }

    return null;
};

/**
 * DO NOT USE THIS METHOD.
 *
 * @private
 *
 * @deprecated use Component.get(key) and Component.set(key,value) instead
 */
Component.prototype.getAttributes = function () {
    //$A.warning("DEPRECATED USE OF component.getAttributes(key). USE component.get(key) AND component.set(key,value) INSTEAD.");
    return this._getAttributes();
};

/**
 * Returns the collection of attributes for this component.
 * See <a href="#help?topic=hideMarkup">Dynamically Showing or Hiding Markup</a> for an example.
 * Shorthand : <code>get("v")</code>
 *
 * TEMPORARILY INTERNALIZED TO GATE ACCESS
 *
 * @private
 */
Component.prototype._getAttributes = function() {
    return this.priv.attributes;
};

/**
 * DO NOT USE THIS METHOD.
 *
 * @public
 *
 * @deprecated use Component.get(key) instead
 */
Component.prototype.getValue = function (key) {
    //$A.warning("DEPRECATED USE OF component.getValue(key). USE component.get(key) INSTEAD.",key);
    return this._getValue(key);
};

/**
 * Returns the wrapped value referenced using property syntax.
 * If you do not need the wrapper, use <code>get()</code> instead.
 * Temporarily internalized to gate access.
 * @param {String} key The data key to look up on the Component. E.g. <code>$A.get("root.v.mapAttring.key")</code>
 *
 * @private
 *
 * @deprecated use Component.get(key,value) instead
 */
Component.prototype._getValue = function(key){
    // Should we deliberately break here?
    if (!this.isValid() || $A.util.isUndefinedOrNull(key)) {
        return undefined;
    }

    // this getValue is special, the only one that accepts an expression or just a key
    if (key.toString() === "PropertyReferenceValue" || key.indexOf(".") !== -1) {
        // then we got an expression, lets deal with it
        return expressionService.getValue(this, key);
    }

    var priv = this.priv;
    var ret = priv.getValueProvider(key, this);

    if (ret === undefined) {
        ret = this.find(key);
    }

    if (ret === undefined && priv.delegateValueProvider){
        ret = priv.delegateValueProvider.getValue(key);
    }

    return ret;
};

/**
 * DO NOT USE THIS METHOD.
 *
 * @public
 *
 * @deprecated use Component.set(key,value) instead
 */
Component.prototype.setValue = function (key,value) {
    //$A.warning("DEPRECATED USE OF component.setValue(key,value). USE component.set(key, value) INSTEAD.", {key:key,value:value});
    return this._setValue(key,value);
};

/**
 * Gets the wrapped value referenced using property syntax and sets the value object's value.
 * @param {String} key The data key to look up on the Component. E.g. <code>$A.get("root.v.mapAttring.key")</code>
 * @param {Object} value The value to set
 *
 * TEMPORARILY INTERNALIZED TO GATE ACCESS
 *
 * @private
 */
Component.prototype._setValue = function(key, value){
    var v = this._getValue(key);
    if ($A.util.isUndefinedOrNull(v)) {
        $A.error("Invalid key "+key);
        return;
    }
    v._setValue(value);
};


/**
 * Returns the value provider.
 * @return {Object} value provider
 */
Component.prototype.getAttributeValueProvider = function() {
    // DCHASMAN TODO: TEMPORARY PASSTHROUGH TO HIDE GETATTRIBUTES()
	return this._getAttributes().getValueProvider();
};

/**
 * Returns the value provider of the component.
 * @return {Object} component or value provider
 */
Component.prototype.getComponentValueProvider = function() {
    // DCHASMAN TODO: TEMPORARY PASSTHROUGH TO HIDE GETATTRIBUTES()
	return this._getAttributes().getComponentValueProvider();
};

/**
 * Merge attributes from another map value.
 * @param {Object} yourMap The map to merge with this AttributeSet.
 */
Component.prototype.mergeAttributes = function(yourMap, overwrite) {
    // DCHASMAN TODO: TEMPORARY PASSTHROUGH TO HIDE GETATTRIBUTES()
	return this._getAttributes().merge(yourMap, overwrite);
};

/**
 * Returns the raw value referenced using property syntax.
 * <code>get()</code> calls <code>getValue()</code> and unwraps the value.
 * If you need the wrapper, which can be used for things like
 * <code>isDirty()</code>, <code>getPreviousValue()</code>, <code>commit()</code>, <code>rollback()</code>, <code>getBooleanValue()</code>,
 * use <code>getWrapper()</code> instead.
 * @param {String} key The data key to look up on the Component.
 * @public
 */
Component.prototype.get = function(key){
    return $A.expressionService.get(this, key);
};

/**
 * Gets the wrapped value referenced using property syntax and sets the value object's value.
 * @param {String} key The data key to look up on the Component. E.g. <code>$A.get("root.v.mapAttring.key")</code>
 * @param {Object} value The value to set
 *
 * @public
 */
Component.prototype.set = function (key, value, ignoreChanges) {
    var v = this._getValue(key);
    if ($A.util.isUndefinedOrNull(v)) {
        $A.error("Invalid key " + key);
        return;
    }
    // JBUCH TODO: EXTRAPOLATE THIS TO ALL FACETS
//    if(key==="v.body"){
//        v.destroy();
//    }
    v._setValue(value,ignoreChanges);
};

/**
 * Gets the concrete implementation of a component. If the component is concrete, the method returns the component itself.
 * For example, call this method to get the concrete component of a super component.
 * @public
 */
Component.prototype.getConcreteComponent = function(){
    var priv = this.priv;
    return priv.concreteComponentId ? componentService.get(priv.concreteComponentId):this;
};

/**
 * Returns true if the component is concrete, or false otherwise.
 * @public
 */
Component.prototype.isConcrete = function() {
    return !this.priv.concreteComponentId;
};

/**
 * Gets the event dispatcher.
 * @public
 */
Component.prototype.getEventDispatcher = function(){
    return this.priv.getEventDispatcher();
};

/**
 * Returns the model for this instance, if one exists.
 * Shorthand : <code>get("m")</code>
 * @public
 */
Component.prototype.getModel = function(){
    return this.priv.model;
};

/**
 * Return a new Event instance of the named component event.
 * Shorthand: <code>get("e.foo")</code>, where e is the name of the event.
 * @param {String} name The name of the Event.
 * @public
 */
Component.prototype.getEvent = function(name) {
    var eventDef = this.getDef().getEventDef(name);
    if (!eventDef) {

        if(this.priv.delegateValueProvider){
            return this.priv.delegateValueProvider.getEvent(name);
        }else{
            return null;
        }
    }
    return new Event({
        "name": name,
        "eventDef": eventDef,
        "component": this.getConcreteComponent()
    });
};

/**
 * Get an event by descriptor qualified name.
 *
 * This is only used by action for firing of component events.
 * It is a bit of a hack (reversing the map).
 *
 * @param {String} descriptor a descriptor qualified name.
 * @return {String} null, or the component event.
 * @protected
 */
Component.prototype.getEventByDescriptor = function(descriptor) {
    var name = this.getDef().getEventNameByDescriptor(descriptor);
    if (name === null) {
        return null;
    }
    return this.getEvent(name);
};

/**
 * @private
 */
Component.prototype.fire = function(name) {
    BaseValue.fire(name, this, this.getEventDispatcher());
};

/**
 * Looks up the specified value and checks if it is currently dirty.
 * @returns true if the value is dirty, and false if it is clean or does not exist.
 * @public
 * @deprecated TEMPORARY WORKAROUND
 */
Component.prototype.isDirty = function(expression){
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; isDirty() SHOULD BE HANDLED AUTOMATICALLY
    var wrapper=this._getValue(expression);
    return (wrapper&&wrapper.isDirty())||false;
};

/**
 * Returns true if the component has not been destroyed.
 * @public
 */
Component.prototype.isValid=function(expression){
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; isValid() SHOULD BE HANDLED THROUGH ERROR EVENTS
    if(expression){
        var wrapper=this._getValue(expression);
        return (wrapper&&wrapper.isValid())||false;
    }
    return !this._scheduledForAsyncDestruction && this.priv;
};

/**
 * Looks up the specified value and sets it to valid or invalid.
 * @public
 * @deprecated TEMPORARY WORKAROUND
 */
Component.prototype.setValid = function (expression,valid) {
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; setValid() SHOULD BE HANDLED THROUGH ERROR EVENTS
    var wrapper = this._getValue(expression);
    if(wrapper&&wrapper.setValid){
        wrapper.setValid(valid);
    }
};

/**
 * Looks up the specified value and adds errors to it.
 * @public
 * @deprecated TEMPORARY WORKAROUND
 */
Component.prototype.addErrors = function (expression, errors) {
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; addErrors() SHOULD BE HANDLED THROUGH ERROR EVENTS
    var wrapper = this._getValue(expression);
    if (wrapper&&wrapper.addErrors) {
        wrapper.addErrors(errors);
    }
};

/**
 * Looks up the specified value and clears errors on it.
 * @public
 * @deprecated TEMPORARY WORKAROUND
 */
Component.prototype.clearErrors = function (expression) {
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; clearErrors() SHOULD BE HANDLED THROUGH ERROR EVENTS
    var wrapper = this._getValue(expression);
    if (wrapper&&wrapper.clearErrors) {
        wrapper.clearErrors();
    }
};


/**
 * Looks up the specified value and gets errors on it.
 * @public
 * @deprecated TEMPORARY WORKAROUND
 */
Component.prototype.getErrors = function (expression) {
    // JBUCH TODO: TEMPORARY PASSTHROUGH TO HIDE SIMPLEVALUES; getErrors() SHOULD BE HANDLED THROUGH ERROR EVENTS
    var wrapper = this._getValue(expression);
    return wrapper ? wrapper.getErrors() : [];
};

/**
 * Returns a string representation of the component for logging.
 * @public
 */
Component.prototype.toString = function(){
    return this.getDef() + ' {' +this.getGlobalId()+ '}'+ (this.getLocalId()?' {' +this.getLocalId()+ '}':'');
};

/**
 * Returns component serialized as Json string
 * @private
 */
Component.prototype.toJSON = function(){

    return $A.util.json.encode(this.output());
};

/**
 * Used by toJson().
 * @private
 */
Component.prototype.output = function(){

    return this.priv.output(this);
};

/**
 * Deprecated. Use <code>$A.util.addClass</code> instead to add a CSS class to an element.
 * @param {Object} clz The new CSS class to add to the component's config.
 */
Component.prototype.addClass = function(clz) {
    var classAttrDef = this.getDef().getAttributeDefs().getDef("class");
    if ($A.util.isUndefinedOrNull(classAttrDef)) {
        return;
    }
    if (clz) {
        clz = $A.util.trim(clz);
        var oldClz = this.get("v.class");
        oldClz = $A.util.trim(oldClz);
        if (oldClz) {
            if ((' ' + oldClz + ' ').indexOf(' ' + clz + ' ') == -1) {
                this._setValue("v.class", oldClz + ' ' + clz);
            }
        } else {
            this._setValue("v.class", clz);
        }
    }
};

/**
 * Deprecated. Use <code>$A.util.removeClass</code> instead to remove a CSS class from an element.
 * @param {Object} clz An existing class to be removed from the component.
 */
Component.prototype.removeClass = function(clz) {
    var classAttrDef = this.getDef().getAttributeDefs().getDef("class");
    if ($A.util.isUndefinedOrNull(classAttrDef)) {
        return;
    }
    var cn = this.get("v.class") || '';
    var split = cn.split(' ');
    var newClass = [];
    var found = false;
    for (var i = 0; i < split.length; i++) {
        var c = split[i];
        if (c === clz) {
            found = true;
        } else {
            newClass.push(c);
        }
    }
    if (found) {
        this._setValue("v.class", newClass.join(' '));
    }
};

/**
 * Returns an object whose keys are the lower-case names of Aura events for which this component currently has handlers.
 */
Component.prototype.getHandledEvents = function(){
    var ret = {};
    var concrete = this.getConcreteComponent();
    var eventDispatcher = concrete.getEventDispatcher();
    if (eventDispatcher){
        for(var name in eventDispatcher){
            if (eventDispatcher.hasOwnProperty(name) && eventDispatcher[name].length) {
                ret[name.toLowerCase()] = true;
            }
        }
    }

    return ret;
};

/**
 * Check if we have an event handler attached.
 * @param {String} eventName The event name associated with this component.
 */
Component.prototype.hasEventHandler = function(eventName) {
    if (eventName) {
        var handledEvents = this.getHandledEvents();
        return handledEvents[eventName.toLowerCase()];
    }
    return false;
};

/**
 * Returns an array of this component's facets, i.e., attributes of type <code>aura://Aura.Component[]</code>
 */
Component.prototype.getFacets = function() {
    if (!this.getFacets.cachedFacetNames) {
        // grab the names of each of the facets from the ComponentDef
        var facetNames = [];
        var attributeDefs = this.getDef().getAttributeDefs();

        attributeDefs.each(function(attrDef) {
            if (attrDef.getTypeDefDescriptor() === "aura://Aura.Component[]") {
                facetNames.push(attrDef.getDescriptor().getName());
            }
        });

        // cache the names--they're not going to change
        this.getFacets.cachedFacetNames = facetNames;
    }

    // then grab each of the facets themselves
    var names = this.getFacets.cachedFacetNames;
    var facets = [];

    for (var i=0, len=names.length; i<len; i++) {
        facets.push(this._getValue("v." + names[i]));
    }
    return facets;
};


/**
 * Constructor for a doc level handler.
 *
 * @param {String} eventName the name of the event (must be valid dom event)
 * @param {Function} callback the callback function for the event (will be wrapped)
 * @param {Component} component the component attached to the handler.
 * @private
 * @constructor
 */
$A.ns.DocLevelHandler = function DocLevelHandler(eventName, callback, component) {
    this.eventName = eventName;
    this.component = component;
    this.enabled = false;
    var that = this;
    this.callback = function(eventObj) {
        if (that.component.isRenderedAndValid()) {
            callback(eventObj);
        }
    };
};

/**
 * Set whether the handler is enabled.
 *
 * This function will enable or disable the handler as necessary. Note that the
 * callback will be called only if the component is rendered.
 *
 * @param {Boolean} enable if truthy, the handler is enabled, otherwise disabled.
 */
$A.ns.DocLevelHandler.prototype.setEnabled = function(enable) {
    if (enable) {
        if (!this.enabled) {
            this.enabled = true;
            $A.util.on(document.body, this.eventName, this.callback);
        }
    } else {
        if (this.enabled) {
            this.enabled = false;
            $A.util.removeOn(document.body, this.eventName, this.callback);
        }
    }
};

var dlp = $A.ns.DocLevelHandler.prototype;
exp(dlp,
    "setEnabled", dlp.setEnabled
);


//#include aura.component.Component_export

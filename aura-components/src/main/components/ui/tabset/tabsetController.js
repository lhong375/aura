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
({
    onInit: function(cmp, evt, helper) {
    	helper.initTabs(cmp);
    },
    
    closeTab: function(cmp, evt, helper) {
    	helper.closeTab(cmp, helper.getTabIndexFromEvent(cmp, evt));
    },
    
    removeTab: function(cmp, evt, helper) {
        helper.removeTab(cmp, helper.getTabIndexFromEvent(cmp, evt));
    },
    
    addTab: function(cmp, evt, helper) {
    	helper.addTab(cmp, evt.getParam("index"), evt.getParam("tab"), evt.getParam("callback"));
    },
    
    getActiveTab: function(cmp, evt, helper) {
    	var tab = helper.getActiveTab(cmp);
    	var callback = evt.getParam("callback");
    	if (typeof callback === "function") {
    	    callback({"tab": tab});
    	}
    },
    
    activateTab: function(cmp, evt, helper) {
        helper.setActive(cmp, {"index": helper.getTabIndexFromEvent(cmp, evt)});
    },
    
    onTabActivated: function(cmp, evt, helper) {
        var index = evt.getParam("index");
        helper.setActiveTabBody(cmp, {"index":index, "tab": cmp._tabCollection.getTab(index), "active": true});
    },
    
    onTabClosed: function(cmp, evt, helper) {
    	helper.removeTabBody(cmp, evt.getParam("index"));
    }
})

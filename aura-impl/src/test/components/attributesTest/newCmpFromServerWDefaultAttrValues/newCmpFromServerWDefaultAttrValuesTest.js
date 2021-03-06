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
    testNewComponentFromServerWithDefaultValues:{
        test:function(cmp){
            $A.componentService.newComponentAsync(
                this,
                function(newCmp){
                    cmp.getValue("v.body").push(newCmp);
                },
                "attributesTest:defaultValue"
            );
            $A.eventService.finishFiring();

            $A.test.addWaitFor(false, $A.test.isActionPending, function(){
                var body = cmp.get('v.body');
                var newCmp = body[0];
                $A.test.assertEquals("markup://attributesTest:defaultValue", newCmp.getDef().getDescriptor().getQualifiedName(),
                        "Failed to create new component: markup://attributesTest:defaultValue");
                $A.test.assertEquals("Aura", newCmp.get("v.strAttributeWithDefaultValue"),
                        "Failed to set default value of simple attributes on client side component");
                $A.test.assertEquals("['red','green','blue']", newCmp.get("v.objAttributeWithDefaultValue"));
                var listAttr = newCmp.getValue("v.listAttributeWithDefaultValue");
                $A.test.assertTrue(listAttr.toString() === "ArrayValue",
                        "Expected to find attribute of ArrayValue type but found"+listAttr.constructor);
                $A.test.assertEquals("Value", listAttr.auraType);
                $A.test.assertEquals("true", listAttr.getValue(0).getValue());
                $A.test.assertEquals("false", listAttr.getValue(1).getValue());
                $A.test.assertEquals("true", listAttr.getValue(2).getValue());

                // Verify attributes without a default value
                $A.test.assertFalsy(newCmp.get("v.strAttributeWithNoDefaultValue"),
                    "Attributes without default value should have undefined as value");
                $A.test.assertFalsy(newCmp.get("v.objAttributeWithNoDefaultValue"),
                    "Attributes without default value should have undefined as value");
                var a = newCmp.get("v.listAttributeWithNoDefaultValue");
                $A.test.assertTrue($A.util.isArray(a));
                $A.test.assertEquals(0, a.length,
                        "Array type attributes without default value should have empty as value");
            });
        }
    }
})

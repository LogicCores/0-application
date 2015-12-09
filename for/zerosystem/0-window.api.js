
exports.forLib = function (LIB) {

    var exports = {};

    exports.spin = function (context) {
        
        var exports = {};
        
        exports.boot = function () {

        	// This module should contain all coupling between cores and is one way to
        	// couple all cores together. The coupling can change based on which cores are used
        	// in a given context and for what purpose.
        	// TODO: Move to 'contexts/0/page'
        	// TODO: Replace all this with declarations when 0-context + ccjson is working in window and server

        	var config = context.config.config;

        	LIB.VERBOSE = !!config.env.VERBOSE;

        	if (LIB.VERBOSE) console.log("Page config:", config);

        	var contexts = {};

        	function initPage () {

                if (LIB.VERBOSE) console.log("initPage()");

        		return LIB.Promise.try(function () {

        			contexts.time = new (LIB.Cores.time.forContexts(contexts)).Context(config.time || {});
        			contexts.page = new (LIB.Cores.page.forContexts(contexts)).Context(config.page || {});
        			contexts.auth = new (LIB.Cores.auth.forContexts(contexts)).Context(config.auth || {});
        			contexts.fetch = new (LIB.Cores.fetch.forContexts(contexts)).Context(config.fetch || {});
        			contexts.request = new (LIB.Cores.request.forContexts(contexts)).Context(config.request || {});
        			contexts.template = new (LIB.Cores.template.forContexts(contexts)).Context(config.template || {});
        			contexts.component = new (LIB.Cores.component.forContexts(contexts)).Context(config.component || {});
        			contexts.data = new (LIB.Cores.data.forContexts(contexts)).Context(config.data || {});
        			contexts.cache = new (LIB.Cores.cache.forContexts(contexts)).Context(config.cache || {});
        
        			// NOTE: This is the new structure!
        			contexts.aspects = {
        				env: new (LIB.Cores.env.forContexts(contexts)).Context(config.env || {}),
        				service: new (LIB.Cores.service.forContexts(contexts)).Context(config.service || {}),
        				skin: new (LIB.Cores.skin.forContexts(contexts)).Context(config.skin || {}),
        				test: new (LIB.Cores.test.forContexts(contexts)).Context(config.test || {}),
        				page: contexts.page
        			};
        
        			// TODO: Make 'adapters' into a core as well.
        			contexts.adapters = {
        				LIB: LIB
        			};
        
        			contexts.adapters["time.moment"] = LIB.Cores.time.adapters.moment.spin(contexts.time);
        			contexts.adapters.time = {
        				moment: contexts.adapters["time.moment"]
        			};
        			contexts.adapters.test = {
        				intern: LIB.Cores.test.adapters.intern.spin(contexts.aspects.test)
        			};
        			contexts.adapters.fetch = {
        				window: LIB.Cores.fetch.adapters.window.spin(contexts.fetch)
        			};
        			contexts.adapters.request = {
        				window: LIB.Cores.request.adapters.window.spin(contexts.request)
        			};
        			contexts.adapters.template = {
        				firewidgets: LIB.Cores.template.adapters.firewidgets.spin(contexts.template),
        				"virtual-dom": LIB.Cores.template.adapters["virtual-dom"].spin(contexts.template)
        			};
        			contexts.adapters.component = {
        				firewidgets: LIB.Cores.component.adapters.firewidgets.spin(contexts.component)
        			};
        			contexts.adapters.cache = {
        				// TODO: Subclass context for each page and component in page and component to namespace localStorage(cache) keys.
        				localStorage: LIB.Cores.cache.adapters.localStorage.spin(contexts.cache)
        			};
        			contexts.adapters.data = {
        				"ccjson.record.mapper": LIB.Cores.data.adapters["ccjson.record.mapper"].spin(contexts.data),
        				"localStorage": LIB.Cores.data.adapters["localStorage"].spin(contexts.data)
        			};
        
        			return config;
        		}).catch(function (err) {
        			console.error("Error initializing page context:", err.stack);
        			throw err;
        		}).then(function () {
        		    if (LIB.VERBOSE) console.log("initPage() done");
        		    return null;
        		});
        	}

        	function initAuthentication () {

                if (LIB.VERBOSE) console.log("initAuthentication()");

        		return LIB.Promise.try(function () {
        			if (context.config.enableAuthentication === false) {
        				return;
        			}
        			contexts.auth.on("changed:authenticated", function (authenticated) {
        				if (authenticated) {
        					contexts.page.setViews([
        						"loggedin",
        						"logout"
        					]);
        				} else {
        					contexts.page.setViews([
        						"loggedout",
        						"login"
        					]);
        				}
        			});
        			contexts.auth.on("redirect", function (url) {
        				contexts.page.redirectTo(url);
        			});
        			LIB.Cores.auth.adapters.passport.spin(contexts.auth);
        		}).catch(function (err) {
        			console.error("Error initializing session:", err.stack);
        			throw err;
        		}).then(function () {
        		    if (LIB.VERBOSE) console.log("initAuthentication() done");
        		    return null;
        		});
        	}

        	function initData() {

                if (LIB.VERBOSE) console.log("initData()");

        		return LIB.waitForLibraryProperty("Collections").then(function (collections) {
        			return LIB.Promise.try(function () {
        				Object.keys(collections).forEach(function (alias) {
        					collections[alias].spin(contexts.data);
        				});
        			});
        		}).then(function () {
        			return LIB.waitForLibraryProperty("CollectionLoaders").then(function (collectionLoaders) {
        				return LIB.Promise.all(collectionLoaders.map(function (spinLoader) {
        					return LIB.Promise.try(function () {
        						return spinLoader(contexts.data);
        					});
        				}));
        			});
        		}).then(function () {

        			contexts.data.notifyInitialized();

                    return null;
        		}).catch(function (err) {
        			console.error("Error initializing data:", err.stack);
        			throw err;
        		}).then(function () {
        		    if (LIB.VERBOSE) console.log("initData() done");
        		    return null;
        		});
        	}
        
        	function initPageManagement () {

                if (LIB.VERBOSE) console.log("initPageManagement()");

        		return LIB.Promise.try(function () {

        			var firewidgets = LIB.Cores.page.adapters.firewidgets.spin(LIB._.extend(contexts.page, {
        				anchors: {
        					"page-content": function (context) {
        					    return firewidgets.loadPageContentForContext(context);
        					}
        				},
        				actions: {
        					"login": function (context) {
        						return LIB.Promise.try(function () {
        							return contexts.auth.login('github');
        						});
        					},
        					"logout": function (context) {
        						return LIB.Promise.try(function () {
        							return contexts.auth.logout('github');
        						});
        					}
        				}
        			}));


                    var cachedSubContexts = {};
                    var currentSubContext = null;

        			contexts.page.on("rendered", function (event) {

        				// TODO: Move to 'contexts/0/page.container'
        				function initContainerContext (contexts) {

    					    if (currentSubContext) {
    					        currentSubContext.container.hide();
    					    }

    					    return LIB.Promise.try(function() {
                                if (cachedSubContexts[event.path]) {
                                    return cachedSubContexts[event.path];
                                }

                                // TODO: Use a proper helper to branch/subclass the contexts

                                var subContexts = LIB._.assign({}, contexts);
                                subContexts.adapters = LIB._.assign({}, subContexts.adapters);

        						subContexts.container = new (LIB.Cores.container.forContexts(subContexts)).Context(config.container || {});
        						subContexts.container.setPageContext(event);
        						subContexts.adapters.container = {
        							firewidgets: LIB.Cores.container.adapters.firewidgets.spin(subContexts.container)
        						};
                                
                                // TODO: Put this elsewhere
                                subContexts.topLevelComponents = null;

                                subContexts.container.on("hide", function () {

                                    if (subContexts.topLevelComponents) {
                                        subContexts.topLevelComponents.forEach(function (topLevelComponent) {
                                            topLevelComponent.hide();
                                        });
                                    }
                                });

        						return (cachedSubContexts[event.path] = subContexts);

    					    }).then(function (_currentSubContext) {

    					        currentSubContext = _currentSubContext;


    					        currentSubContext.container.renderTo(event.domNode);


                                var components = {};

                                // We only look for sub components from our template
                                event.subComponents.forEach(function (name) {
                        			var componentElement = $('[data-component-id="' + name + '"]', event.domNode);
                        			var componentId = componentElement.attr("data-component-id");
                        			components[componentId] = {
                        			    id: componentId,
                        			    impl: componentElement.attr("data-component-impl") || "",
                        			    container: currentSubContext.container,
                        			    domNode: componentElement
                        			};
                        			// HACK: This should be fixed on server.
                        			if (components[componentId].impl === "null") {
                        			    components[componentId].impl = "";
                        			}
                        		});	        
                        		
//                        		currentSubContext.component.resetComponentsForActivePage();


    							return currentSubContext.adapters.component.firewidgets.instanciateComponents(
    							    components
                                ).then(function (_topLevelComponents) {
/*                                            
                                    if (topLevelComponents) {
                                        topLevelComponents.forEach(function topLevelComponent) {
console.log("destroy ")
                                            topLevelComponent.destroy();
                                        });
                                    }
*/


                                    currentSubContext.topLevelComponents = _topLevelComponents;

                                    currentSubContext.topLevelComponents.forEach(function (topLevelComponent) {
                                        topLevelComponent.renderTo(components[topLevelComponent.id].domNode);
                                    });

                                    return null;

    							}).catch(function (err) {
    								console.error("Error initializing components:", err.stack);
    								throw err;
    							});
        					});
        				}

        				// TODO: Implement contexts recovery so we can bypass loading everything fresh
        				//       when loading same container again.
        				// TODO: Implement various ways to determine canonical container id.
        
        				return initContainerContext(
        					contexts
        					// TODO: Move to context clone/subclass function.
        //					LIB._.assign(LIB._.clone(contexts), {
        //						adapters: LIB._.clone(contexts.adapters)
        //					})
        				).catch(function (err) {
        					console.error("Error initializing container context:", err.stack);
        				}).then(function () {

                            // We inform the page that we are done loading, initializing and rendering all components.
                            // Only after we have notified the page will it allow navigation to a new uri.
                            // We can notify the page sooner (and allow naviagtion sooner) if the component init logic
                            // may be interrupted at any time.
                            // TODO: Notify page sooner once we can interrupt component init logic.

        				    contexts.page.notifyPageAnimated();
        				    return null;
        				});
        			});
        
        		}).catch(function (err) {
        			console.error("Error initializing page management:", err.stack);
        			throw err;
        		}).then(function () {
        		    if (LIB.VERBOSE) console.log("initPageManagement() done");
        		    return null;
        		});
        	}

        	function initComponents () {

                if (LIB.VERBOSE) console.log("initComponents()");

                // TODO: Revise this to batch-load components before they are needed by pages.
        		return LIB.Promise.try(function () {
        			// DEPRECATED: Use 'application.config.waitForComponents = false'
        			if (window.__skipWaitForComponents) {
        				console.error("'window.__skipWaitForComponents' is deprecated! Use 'application.config.waitForComponents === false' instead.");
        				return;
        			}
        			if (context.config.waitForComponents === false) {
        				return;
        			}
        			var componentContext = {
        				cores: contexts
        			};
        			// TODO: Use 'cores/component/firewidget'
        			return LIB.waitForLibraryProperty("Components").then(function (components) {
        				Object.keys(components).forEach(function (alias) {
        					contexts.component.registerComponentInstanceFactory(
        						alias,
        						components[alias].forContext(componentContext)
        					);
        				});
        			});
        		}).catch(function (err) {
        			console.error("Error initializing components:", err.stack);
        			throw err;
        		}).then(function () {
        		    if (LIB.VERBOSE) console.log("initComponents() done");
        		    return null;
        		});
        	}

        	return initPage().then(function () {
        		return LIB.Promise.all([
        			initAuthentication(),
        			initData(),
        			initPageManagement(),
        			initComponents()
        		]);
        	}).then(function () {
        		// Spin up the page.
        		LIB.Cores.page.adapters.page.spin(contexts.page);
        
        		// TODO: Namespace this variable so each stack can export its own or modified version of a common one?
        		window.contexts = contexts;
        	});
        }

        return exports;
    }

    return exports;
}

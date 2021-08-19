sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/unified/FileUploaderParameter",
	"sap/ui/model/Filter"
], function(Controller, MessageBox, MessageToast, FileParameter, Filter) {
	"use strict";

	return Controller.extend("ZHR_FI_TV_RES.ZHR_FI_TV_RES.controller.BaseController", {
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function(sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = (this.getModel("objectView") || this.getModel("worklistView"));
			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Adds a history entry in the FLP page history
		 * @public
		 * @param {object} oEntry An entry object to add to the hierachy array as expected from the ShellUIService.setHierarchy method
		 * @param {boolean} bReset If true resets the history before the new entry is added
		 */
		addHistoryEntry: (function() {
			var aHistoryEntries = [];

			return function(oEntry, bReset) {
				if (bReset) {
					aHistoryEntries = [];
				}

				var bInHistory = aHistoryEntries.some(function(entry) {
					return entry.intent === oEntry.intent;
				});

				if (!bInHistory) {
					aHistoryEntries.push(oEntry);
					this.getOwnerComponent().getService("ShellUIService").then(function(oService) {
						oService.setHierarchy(aHistoryEntries);
					});
				}
			};
		})(),

		onFileType: function() {
			MessageBox.warning(this.getResourceBundle().getText("fileMatch"));
		},

		onFileNameLength: function(e) {
			var maxLength = e.getSource().getMaximumFilenameLength();
			MessageBox.warning(this.getResourceBundle().getText("fileNameLength", maxLength));
		},

		onFileSize: function() {
			MessageBox.warning(this.getResourceBundle().getText("fileSize"));
		},

		onUploadComplete: function(e) {
			var uploader = e.getSource(),
				name = uploader.getValue(),
				tableId = uploader.data("refreshTable");
			if (tableId) {
				var table = this.getFieldGroups(this.getView().getControlsByFieldGroupId(tableId))[0];
				table.getBinding("items").refresh(true);
			}
			MessageToast.show(this.getResourceBundle().getText("uploadSuccessful", name));
			uploader.setValue("").fireChange();
		},
		getFieldGroups: function(items) {
			var fields = [];
			items.forEach(function(item) {
				if (item["mProperties"].hasOwnProperty("fieldGroupIds")) {
					fields.push(item);
				}
			});
			return fields;
		},

		//Событие отрабатывает последовательно для каждого загружаемого файла
		onUploadStart: function(e) {
			var uploader = e.getSource(),
				name = encodeURI(e.getParameter("fileName")),
				type = uploader.data("type") ? uploader.data("type") : "",
				pernr =  this.args.Pernr,	// this.getModel("emp").getProperty("/Pernr"),
				codeType = "",	//	uploader.data("codeType") ? uploader.data("codeType") : "",
				docNo = "",	// uploader.data("docNo") ? uploader.data("docNo") : "",
				expType = "";	// uploader.data("expType") ? uploader.data("expType") : "";
			e.getParameter('requestHeaders').forEach(function(el) {
				if (el.name === "SLUG") {
					el.value = el.value + "~" + name + "~" + type + "~" + pernr + "~" + codeType + "~" + docNo + "~" + expType;
				}
			});
		},

		openDialog: function(e) {
			var dialog = this.getDialog(e);
			if (!dialog) {
				var id = typeof e === "string" ? e : e.getSource().data("id");
				dialog = sap.ui.xmlfragment("fragment.dialog." + id, this);
				this.getView().addDependent(dialog);
			}
			dialog.open();
		},

		cancelDialog: function(e) {
			var dialog = this.getDialog(e);
			dialog.close();
		},

		getDialog: function(e) {
			var id = typeof e === "string" ? e : e.getSource().data("id");
			var dialog = sap.ui.getCore().byId(id);
			return dialog;
		},

		afterCloseDialog: function(e) {
			var dialog = e.getSource(); //this.getDialog(e);
			dialog.destroy();
		},
		
		onRequestTypeChange: function(e) {
			var select = e.getSource();
			var key = select.getSelectedKey();
			var hboxItems = select.getParent().getParent().getItems();
			// avia
			var visible = key === "RF" || key === "OF" ? true : false;
			[hboxItems[3], hboxItems[4], hboxItems[5]].forEach(function(vbox) {
				vbox.setVisible(visible);
			});
			// train
			visible = key === "RT" || key === "OT" ? true : false;
			hboxItems[6].setVisible(visible);
			// other + auto
			visible = key === "O" || key === "CE" ? false : true;
			var fieldGroupIds = visible ? ["form3"] : ["none"];
			[hboxItems[8], hboxItems[9], hboxItems[10]].forEach(function(vbox) {
				vbox.setVisible(visible);
			});
			[hboxItems[9], hboxItems[10]].forEach(function(vbox) {
				vbox.getItems()[1].setFieldGroupIds(fieldGroupIds);
			});
			visible = key === "CE" ? true : false;
			//hboxItems[11].setVisible(visible);
		},

		changeBookingStatus: function(e, msg) {
			// if (oEvent.getSource().getParent().getBindingContext().getProperty("ReservUname") === "") {
			var status, pernr, reinr;
			var appModel = this.getModel("appView");
			appModel.setProperty("/busy", true);
			if (typeof e === "string") {
				status = e;
				pernr = this.getView().getBindingContext().getProperty("Pernr");
				reinr = this.getView().getBindingContext().getProperty("Reinr");
			} else {
				status = e.getSource().data("status");
				pernr = e.getSource().getParent().getBindingContext().getProperty('Pernr');
				reinr = e.getSource().getParent().getBindingContext().getProperty('Reinr');
			}
			var that = this;
			msg = msg ? msg : "";
			var model = this.getModel();
			model.callFunction("/Reserve", {
				method: "GET",
				urlParameters: {
					"Message": msg,
					"Pernr": pernr,
					"Reinr": reinr,
					"Status": status,
					"AppId": "RES"

				},
				success: function(data) {
					model.refresh(true);
					that.getModel().updateBindings(true);
					that._appViewModel(status);
					appModel.setProperty("/busy", false);
				}
			});
			// }
		},

		_appViewModel: function(status) {
			var appModel = this.getModel("appView");
			appModel.setProperty("/isTakeButtonEnabled", false);
			appModel.setProperty("/isCancelButtonEnabled", false);
			appModel.setProperty("/isButtonsEnabled", false);
			appModel.setProperty("/isTripsEnabled", false);
			if (this.getView().getBindingContext()) {
				var obj = this.getView().getBindingContext().getObject();
				var executor = obj.Executor;
				var reservSt = status ? status : obj.ReservSt; //reservSt = status; // obj.ReservSt;
				// var user = sap.ushell.services.UserInfo.getId();
				var user = sap.ushell.Container ? sap.ushell.Container.getService("UserInfo").getId() : "SETATSIEV";
				user = user === "DEFAULT_USER" ? "TEST00004950" : user;
				// user = user === "Default User" ? "SETATSIEV" : user;
				if (user === executor) {
					if (reservSt === "3" || reservSt === "7" || reservSt === "4") {
						appModel.setProperty("/isTakeButtonEnabled", false);
						appModel.setProperty("/isCancelButtonEnabled", false);
						appModel.setProperty("/isButtonsEnabled", false);
						appModel.setProperty("/isTripsEnabled", false);
					} else if (reservSt === "6") {
						appModel.setProperty("/isTakeButtonEnabled", false);
						appModel.setProperty("/isCancelButtonEnabled", true);
						appModel.setProperty("/isButtonsEnabled", false);
						appModel.setProperty("/isTripsEnabled", false);
					} else {
						appModel.setProperty("/isTakeButtonEnabled", false);
						appModel.setProperty("/isCancelButtonEnabled", true);
						appModel.setProperty("/isButtonsEnabled", true);
						appModel.setProperty("/isTripsEnabled", true);
					}
					appModel.setProperty("/changeExecutor", "Взять в работу");
				} else {
					appModel.setProperty("/isTakeButtonEnabled", true);
					appModel.setProperty("/isCancelButtonEnabled", false);
					appModel.setProperty("/isButtonsEnabled", false);
					appModel.setProperty("/isTripsEnabled", false);
					if (executor) {
						appModel.setProperty("/changeExecutor", "Изменить исполнителя");
					} else {
						appModel.setProperty("/changeExecutor", "Взять в работу");
					}
				}
				appModel.refresh();
			}
		},

		showConfirmDialog: function(oEvent) {
			this.openDialog(oEvent.getSource().data("dialog"));
		},

		onSuggest: function(e) {
			var input = e.getSource();
			var filterValue = e.getParameter("suggestValue");
			var filterName = input.data("filterName");
			var aFilters = [];
			if (filterValue) {
				if (!isNaN(filterValue) && input.data("filterKey")) {
					filterName = input.data("filterKey");
				}
				aFilters.push(new Filter(filterName, sap.ui.model.FilterOperator.Contains, filterValue));
			}
			input.getBinding("suggestionItems").filter(aFilters);
			if (input.data("filterKey")) {
				input.setBusy(true);
			}
		},
		
		inputProperties: ["value", "selectedKey", "selected", "dateValue", "selectedIndex"],
		getItems: function(items, inputsArg) {
			var inputs = inputsArg || [];
			if (!Array.isArray(items)) {
				items = items.getContent();
			}
			items.forEach(function(item) {
				var id = item.getId();
				if ((id.indexOf("vbox") > -1 || id.indexOf("hbox") > -1 || id.indexOf("panel") > -1 || id.indexOf("item") > -1) && item.getVisible()) {
					var innerItems = id.indexOf("panel") > -1 || id.indexOf("item") > -1 ? item.getContent() : item.getItems();
					this.getItems(innerItems, inputs);
					if (id.indexOf("panel") > -1) {
						this.getItems(item.getHeaderToolbar().getContent(), inputs);
					}
				} else {
					this.inputProperties.forEach(function(property) {
						if (item.getBindingInfo(property)) {
							inputs.push(item);
						}
					}, this);
				}
			}, this);
			return inputs;
		},

		getData: function(items) {
			var data = {};
			items.forEach(function(item) {
				var name = item.mProperties.name || item.data("name");
				if (item.data("checkProperty")) {
					data[name] = item.data(item.data("checkProperty"));
				} else {
					this.inputProperties.forEach(function(property) {
						if (item.getBindingInfo(property) && name) {
							var value = item.getProperty(property);
							if (typeof value === "string") {
								value = value.replace(/_/gi, "");
							}
							if (item.data("type")) {
								if (item.data("type") === "string") {
									value = value.toString();
								} else if (item.data("type") === "boolean") {
									value = (value == "true");
								} else {
									value = Number(value);
								}
							}
							if (item.data("getText") && item.getSelectedItem()) {
								value = item.getSelectedItem().getText();
							}
							if (item.getBindingInfo("dateValue")) {
								value = value ? new Date(value.valueOf() - value.getTimezoneOffset() * 60000) : null;
							}
							if (name.indexOf("~") > -1) {
								var n = name.split("~");
								var v = [];
								if (item.getBindingInfo("secondDateValue")) {
									v.push(value);
									var secondValue = item.getProperty("secondDateValue");
									v.push(secondValue);
								} else {
									v = value.split("~");
								}
								if (item.data("split")) {
									var regexp = ".{1," + item.data("split") + "}";
									var r = new RegExp(regexp, "g");
									v = value.match(r);
								}
								n.forEach(function(house, i) {
									data[house] = v[i];
								});
							} else {
								data[name] = value;
							}
						}
					}, this);
				}
			}, this);
			return data;
		}
	});

});
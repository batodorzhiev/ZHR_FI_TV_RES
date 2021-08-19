/*global location*/
sap.ui.define([
	"ZHR_FI_TV_RES/ZHR_FI_TV_RES/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"ZHR_FI_TV_RES/ZHR_FI_TV_RES/model/formatter",
	"sap/ui/model/Filter",
	"sap/m/MessageToast",
	"sap/ui/unified/FileUploaderParameter"
], function(BaseController, JSONModel, History, formatter, Filter, MessageToast, FileParameter) {
	"use strict";

	return BaseController.extend("ZHR_FI_TV_RES.ZHR_FI_TV_RES.controller.Object", {

		formatter: formatter,

		onInit: function() {
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function() {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			// console.log(jQuery.sap.getModulePath("ZHR_FI_TV_RES.ZHR_FI_TV_RES"));
			this.byId("profileImage").setSrc(jQuery.sap.getModulePath("ZHR_FI_TV_RES.ZHR_FI_TV_RES") + "/localService/profile.png");
			var that = this;
			this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
				oShellService.setBackNavigation(function() {
					that.getRouter().getTargets().display("worklist");
					var oHistory = History.getInstance();
					var sPreviousHash = oHistory.getPreviousHash();
					if (sPreviousHash !== undefined) {
						window.history.go(-1);
					} else {
						var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
						oRouter.navTo("worklist", false);
					}
				});
			});
		},

		_onObjectMatched: function(oEvent) {
			this.args = oEvent.getParameter("arguments");
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("/RequestSet", {
					Reinr: this.args.Reinr,
					Pernr: this.args.Pernr
				});
				this._bindView(sObjectPath);
			}.bind(this));

		},

		_bindView: function(sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();
			oDataModel.setSizeLimit(1000);
			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oDataModel.metadataLoaded().then(function() {
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
						oViewModel.updateBindings(true);
					}
				},
				parameters: {
					expand: "ToTrips"
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var obj = oView.getBindingContext().getObject();
			oViewModel.setProperty("/busy", false);
			// Add the object page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("objectTitle") + " - № " + obj.Reinr,
				icon: "sap-icon://enter-more",
				intent: "#ZHR_FI_TV_RES-display&/RequestSet/" + obj.Reinr + "/" + obj.Pernr
			});
			this.byId("EmployeesSet").getBinding("suggestionItems").filter(new Filter("Pernr", sap.ui.model.FilterOperator.EQ, obj.Pernr));

			var appModel = this.getModel("appView");
			this._appViewModel();

			appModel.setProperty("/isBusy", false);

			var tripsLength = this.byId("tripsLength").getText();
			oViewModel.setProperty("/tripsLength", tripsLength);
		},

		onUpdateFinished: function(oEvent) {
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("trips", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("trip");
			}
			this.getModel("appView").setProperty("/tripsTitle", sTitle);
		},

		// Event triggered after all fio(employees) data received 
		onInputDataRecieved: function(e) {
			var id = e.getSource().getPath().substr(1);
			var items = this.getFieldGroups(this.getView().getControlsByFieldGroupId(id));
			items.forEach(function(item) {
				item.setBusy(false);
			}, this);
		},

		onTripsLoaded: function(e) {
			if (this.args.Create && !this.updateOnce) {
				this.getView().getElementBinding().refresh(true);
				this.updateOnce = true;
			}
		},

		onChangeStatus: function(e) {
			var model = this.getModel();
			var button = e.getSource();
			var status = button.data("status");
			var comment = status === "02" ? sap.ui.getCore().byId("declineCommentary").getValue() : "";
			var reinr = this.args.Reinr;
			model.callFunction('/TRHandler', {
				method: 'GET',
				urlParameters: {
					"Comment": comment,
					"Status": status,
					"Reinr": reinr
				},
				success: function(oData) {
					var text = "Заявка согласована";
					if (comment) {
						var id = button.data("id");
						sap.ui.getCore().byId(id).close();
						text = "Заявка отклонена";
					}
					MessageToast.show(text);
				}
			});
		},

		objectCheckLength: function(e) {
			var textarea = e.getSource();
			var value = e.getParameter("value");
			var buttonStringArray = textarea.data("checkButton").split(",");
			var length = Number(textarea.data("length"));
			var maxLength = Number(textarea.getMaxLength());
			var enabled = value && value.length >= length && value.length <= maxLength ? true : false;
			buttonStringArray.forEach(function(buttonString) {
				var button = this.byId(buttonString) ? this.byId(buttonString) : sap.ui.getCore().byId(buttonString);
				button.setEnabled(enabled);
			}, this);
			var textareaState = enabled ? "None" : "Warning";
			textarea.setValueState(textareaState).setValueStateText(textarea.getValueStateText());
		},

		onTransFileLoaded: function(e) {
			var list = e.getSource();
			var filterValue = list.data("filter");
			if (!this[filterValue]) {
				var filter = new Filter("Type", sap.ui.model.FilterOperator.EQ, filterValue);
				list.getBinding("items").filter(filter);
				this[filterValue] = true;
			}
		},

		uploadTransFile: function(e) {
			var button = e.getSource();
			var reinr = button.data("reinr");
			var uploader = button.getParent().getItems()[0].getItems()[0];
			var model = this.getModel();
			uploader.removeAllHeaderParameters();
			uploader.addHeaderParameter(new FileParameter({
				name: 'SLUG',
				value: reinr
			}));
			uploader.addHeaderParameter(new FileParameter({
				name: 'x-csrf-token',
				value: model.getSecurityToken()
			}));
			uploader.upload();
		},

		deleteFile: function(e) {
			var button = e.getSource();
			var model = this.getModel();
			var text = this.getResourceBundle().getText("deleteSuccessful");
			var url = button.getBindingContext().getPath();
			var parameters = {
				success: function() {
					MessageToast.show(text);
				}
			};
			model.remove(url, parameters);
		},

		onUpload: function() {
			var pernr = this.args.Pernr,
				reinr = this.args.Reinr,
				types = ["Aeroflot", "Siberia", "Hotel"];
			// fio = this.getView().getBindingContext().getObject().Fio
			// path = "mailto:?subject=Заявка на бронирование № (" + this.args.Reinr + ") " + fio;
			// window.open(path);
			types.forEach(function(t) {
				window.open("/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/LoadBookingSet(Pernr='" + pernr + "',Reinr='" + reinr +
					"',Type='" + t + "')/$value");
			});
		},
		
		toOutlook: function(){
			var fio = this.getView().getBindingContext().getObject().Fio,
				path = "mailto:?subject=Заявка на бронирование № (" + this.args.Reinr + ") " + fio;
			window.open(path);
		},

		checkAttachments: function() {
			var i = 0;
		},

		okDialog: function(oEvent) {
			var allow = true;
			if (oEvent.getSource().data('preCheck')) {

				var controls = this.getView().getContent()[0];
				controls.findElements(true).forEach(function(f) {
					if (f.getMetadata().getName() === 'sap.ui.unified.FileUploader') {
						f.getParent().getParent().findElements(true).forEach(function(e) {
							if (e.getMetadata().getName() === 'sap.m.List') {
								if (!e.getAggregation('items').length) {
									allow = false;
								}
							}
						});
					}
				});
			}

			if (allow) {
				if (oEvent.getSource().data('msg')) {
					var msg = oEvent.getSource().getParent().getContent()[1].getValue();
				}
				this.changeBookingStatus(oEvent.getSource().data("status"), msg);
			} else {
				MessageToast.show("Загрузите файлы");
			}
			oEvent.getSource().getParent().destroy();
		},

		onFileChange: function(e) {
			var uploader = e.getSource();
			var enabled = uploader.getValue() ? true : false;
			var button = uploader.getParent().getParent().getItems()[1];
			button.setEnabled(enabled);
		},

		onSave: function(e) {
			var headerInputs = this.getItems(this.byId("form1").getItems()),
				trips = this.byId("trips").getItems(),
				odata = this.getData(headerInputs),
				tripsArr = [],
				appModel = this.getModel("appView"),
				button = e.getSource(),
				model = this.getModel();
			odata.EditFlag = true;
			odata.ReservNot = true;
			odata.Action = "0";
			trips.forEach(function(t, i) {
				var number = (i + 1).toString(),
					headerItems = this.getItems(t.getContent()[0].getContent()[0].getItems()),
					headerData = this.getData(headerItems),
					transTo = t.getContent()[0].getContent()[1].getItems()[0].getItems()[1].getItems(),
					transFrom = t.getContent()[0].getContent()[1].getItems()[1].getItems()[1].getItems(),
					transHotel = t.getContent()[0].getContent()[1].getItems()[2].getItems()[1].getItems(),
					allTransports = transTo.concat(transFrom, transHotel);

				headerData.ItineraryNumber = number;
				headerData.RequestType = "";
				delete headerData.Betfa;
				tripsArr.push(headerData);
				allTransports.forEach(function(trans) {
					var transItems = this.getItems(trans);
					var transData = this.getData(transItems);
					transData.ItineraryNumber = number;
					tripsArr.push(transData);
				}, this);
			}, this);
			odata.ToTrips = tripsArr;
			appModel.setProperty("/appBusy", true);
			button.setEnabled(false);
			model.create("/RequestSet", odata, {
				success: function() {
					appModel.setProperty("/appBusy", false);
					button.setEnabled(false);
					model.refresh(true);
				},
				error: function() {
					appModel.setProperty("/appBusy", false);
					button.setEnabled(true);
				}
			});
			console.log(odata);
		}

	});

});
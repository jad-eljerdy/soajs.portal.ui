"use strict";
var serviceUracApp = soajsApp.components;

serviceUracApp.service('tenantMembersModuleDevHelper', ['ngDataApi', '$timeout', '$cookies', '$modal', function (ngDataApi, $timeout, $cookies, $modal) {
	
	function listMembers(currentScope, moduleConfig, firsCall, callback) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/listUsers",
			"proxy": true,
			"params": {
				"start": currentScope.startLimit,
				"limit": currentScope.endLimit,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				"tenantCode": tCode
			}
		};
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
			}
			else {
				if (callback && typeof(callback) === 'function') {
					return callback(response);
				}
				else {
					printMembers(currentScope, moduleConfig, response, firsCall);
				}
			}
		});
	}
	
	function printMembers(currentScope, moduleConfig, response, firsCall) {
		for (var x = 0; x < response.length; x++) {
			if (response[x].groups) {
				response[x].grpsArr = response[x].groups.join(', ');
			}
			else {
				response[x].grpsArr = '';
			}
		}
		
		var options = {
			grid: moduleConfig.grid,
			data: response,
			defaultSortField: 'username',
			left: [],
			top: [],
			apiNavigation: {
				previous: {
					'label': 'Prev',
					'handler': 'getMore'
				},
				next: {
					'label': 'Next',
					'handler': 'getMore'
				},
				last: {
					'label': 'Last',
					'handler': 'getMore'
				}
			}
		};
		options.grid.navigation = {
			firsCall: firsCall,
			startLimit: currentScope.startLimit,
			totalCount: currentScope.totalCount,
			endLimit: currentScope.endLimit,
			totalPagesActive: currentScope.totalPagesActive
		};
		
		if (currentScope.access.adminUser.editUser) {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editMember'
			});
		}
		if (currentScope.access.adminUser.editUserConfig) {
			options.left.push({
				'label': translation.editACL[LANG],
				'icon': 'unlocked',
				'handler': 'editAcl'
			});
		}
		if (currentScope.access.adminUser.changeStatusAccess) {
			options.top = [
				{
					'label': translation.activate[LANG],
					'msg': translation.areYouSureWantActivateSelectedMember[LANG],
					'handler': 'activateMembers'
				},
				{
					'label': translation.deactivate[LANG],
					'msg': translation.areYouSureWantDeactivateSelectedMember[LANG],
					'handler': 'deactivateMembers'
				}
			];
		}
		buildGrid(currentScope, options);
	}
	
	function addMember(currentScope, moduleConfig) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var config = angular.copy(moduleConfig.form);
		
		overlayLoading.show();
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/group/list",
			"proxy": true,
			"params": {
				"tenantCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase()
			}
		};
		
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				var grps = [];
				for (var x = 0; x < response.length; x++) {
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': false});
				}
				config.entries.push({
					'name': 'groups',
					'label': translation.groups[LANG],
					'type': 'checkbox',
					'value': grps,
					'tooltip': translation.assignGroups[LANG]
				});
				var options = {
					timeout: $timeout,
					form: config,
					name: 'addMember',
					label: translation.addNewMember[LANG],
					actions: [
						{
							'type': 'submit',
							'label': translation.addMember[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups
								};
								overlayLoading.show();
								var opts = {
									"method": "send",
									"routeName": "/urac/owner/admin/addUser",
									"proxy": true,
									"params": {
										"tenantCode": tCode,
										"__env": currentScope.currentSelectedEnvironment.toUpperCase()
									},
									"data": postData
								};
								
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									overlayLoading.hide();
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.memberAddedSuccessfully[LANG]);
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});
		
	}

	function editMember(currentScope, moduleConfig, data) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var config = angular.copy(moduleConfig.form);
		
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/group/list",
			"proxy": true,
			"params": {
				"tenantCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase()
			}
		};
		
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				var grps = [];
				var datagroups = [];
				if (data.groups) {
					datagroups = data.groups;
				}
				var sel = false;
				for (var x = 0; x < response.length; x++) {
					sel = datagroups.indexOf(response[x].code) > -1;
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': sel});
				}
				config.entries.push({
					'name': 'groups',
					'label': translation.groups[LANG],
					'type': 'checkbox',
					'value': grps,
					'tooltip': translation.assignGroups[LANG]
				});
				config.entries.push({
					'name': 'status',
					'label': translation.status[LANG],
					'type': 'radio',
					'value': [{'v': 'pendingNew'}, {'v': 'active'}, {'v': 'inactive'}],
					'tooltip': translation.selectStatusUser[LANG]
				});
				
				var options = {
					timeout: $timeout,
					form: config,
					'name': 'editMember',
					'label': translation.editMember[LANG],
					'data': data,
					'actions': [
						{
							'type': 'submit',
							'label': translation.editMember[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups,
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};
								var opts = {
									"method": "send",
									"routeName": "/urac/owner/admin/editUser",
									"proxy": true,
									"params": {
										"tenantCode": tCode,
										"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
										"uId": data['_id']
									},
									"data": postData
								};
								
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.memberUpdatedSuccessfully[LANG]);
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function activateMembers(currentScope) {
		var tCode = $cookies.getObject('urac_merchant').code;
		overlayLoading.show();
		var config = {
			'routeName': "/urac/owner/admin/changeUserStatus",
			"proxy": true,
			"params": {
				"tenantCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				'uId': '%id%',
				'status': 'active'
			},
			'msg': {
				'error': translation.errorMessageActivateMembers[LANG],
				'success': translation.successMessageActivateMembers[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			overlayLoading.hide();
			currentScope.listMembers();
		});
	}
	
	function deactivateMembers(currentScope) {
		var tCode = $cookies.getObject('urac_merchant').code;
		overlayLoading.show();
		var config = {
			'routeName': "/urac/owner/admin/changeUserStatus",
			"proxy": true,
			"params": {
				"tenantCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				'uId': '%id%', 'status': 'inactive'
			},
			'msg': {
				'error': translation.errorMessageDeactivateMembers[LANG],
				'success': translation.successMessageDeactivateMembers[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			overlayLoading.hide();
			currentScope.listMembers();
		});
	}
	
	return {
		'listMembers': listMembers,
		'printMembers': printMembers,
		'addMember': addMember,
		'editMember': editMember,
		'activateMembers': activateMembers,
		'deactivateMembers': deactivateMembers
	};
}]);
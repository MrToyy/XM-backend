	//查找语句对应accountRef
	//输入：str
	//输出：accountRef
	//算法：穷举词组匹配mapping表
	function searchRef(str){
		str=str+"";
		var searchLimit=0;
		var promises=[];
		var l=str.length;
		var r="99999";//未定义的暂存科目
		var Mapping=Parse.Object.extend("Mapping");
		var SearchConflict=Parse.Object.extend("SearchConflict");
		var searchConflict=new SearchConflict();
		
		if (l==1){//str长度为1，用equalTo进行查询
			var q=new Parse.Query(Mapping);
			q.equalTo("keyWords",str);
			//console.log("searchRef: keywords= "+str);
			promises.push(
				q.find().then(function(results){
					if(results.length){
						return results[0].fetch();
					}else
						return Parse.Promise.error("Not Found");//未定义的暂存科目
				}).then(function(result){
						//console.log("searchRef found with: "+result.get("accountRef"));
						r=result.get("accountRef");
						return Parse.Promise.as("Found");
				},function(error){
					//console.log(error);
					return Parse.Promise.as(error);
				})
			);
		}else{//str长度超过1，用最小长度为2的字符串进行startsWith查询，效率较高
			for (var i=l;i>1;i--){
				for (var j=0;j<l-i+1;j++){
					if (searchLimit++>20) break;
					var q=new Parse.Query(Mapping);
					q.startsWith("keyWords",str.substr(j,i));
					//console.log("searchRef: keywords= "+str.substr(j,i));
					//q.limit(1);
					promises.push(
						q.find().then(function(results){
							//console.log("searchRef found "+results.length+" results");
							if(results.length>1) {searchConflict.set("string",str); searchConflict.save();}//记录搜索结果超过1个的关键字
							if(results.length){
								return results[0].fetch();
							}else return Parse.Promise.error("Not Found");
						}).then(function(result){
							//console.log("searchRef found with: "+result.get("accountRef"));
							r=result.get("accountRef");
							return Parse.Promise.as("Found");
						},function(error){
							//console.log(error);
							return Parse.Promise.as(error);
						})
					);
				}
			}
		}
		//console.log("there are "+promises.length+" queries");
		return Parse.Promise.when(promises).then(function(x){
			//console.log("result of "+str+" is "+r);
			return Parse.Promise.as(r);
		});
	}
	
	
	//--------------------------------------------------------------------------
	//用户记录类
	var XMEntry = Parse.Object.extend("XMEntry",{
		//instance methods
		parseDescription: function(){//description为记账命令时调用
			var self=this;
			var des=self.get("description")+"";
			var promisesAll=[];
			
			//console.log("parDescription: description= "+des);
			
			if (des.length){//des不为空
				if (des.substr(0,1)=="?" || des.substr(0,1)=="？"){return self.parseCommand();}//跳转至parseCommand
				var desArr=des.split(" ");//用空格拆分
				if (desArr.length==1){//des没有空格
					if (isNaN(desArr[0])){//des没有空格且不为数字
						self.set("returnCode", "900");
						promisesAll.push(Parse.Promise.as("not a entry"));
					}else{//des只有数字，为默认现金支出其他消费
						//var promises=[];
						//promises.push(searchRef("其他"));
						//promises.push(searchRef("现金"));
						
						//promisesAll.push(
							//Parse.Promise.when(promises).then(function(debitRef, creditRef){
								self.set("amount",Number(desArr[0]));
								self.set("debitRef","59999");
								self.set("creditRef","10101");
								
								self.set("returnCode","100");
								
								//console.log("parseDescription: descriptioni is a number: "+self.get("amount"));
								//console.log("parseDescription: debitRef: "+self.get("debitRef"));
								//console.log("parseDescription: creditRef: "+self.get("creditRef"));
								
								promisesAll.push(Parse.Promise.as("done"));
							//})
						//);
					}
				}else{//des拆分数量多于一个
					var f=false, debitStr="", creditStr="";
					for (var i=0;i<desArr.length;i++){//寻找第一个数字，该数字左边为贷方表述，右边为借方表述
						if (isNaN(desArr[i]) || f ){
							if (f){
								debitStr+=desArr[i];
							}else{
								creditStr+=desArr[i];
							}
						}else{
							f=true;
							var am=Number(desArr[i]);
						}
						//console.log("parseDescription: desArr["+i+"] = "+desArr[i])+" f= "+f;
					}
					if (f){//找到了数字的情况，查找ref，没有则默认为现金支出其他消费
						if (debitStr=="") debitStr="其他";//默认值
						if (creditStr=="") creditStr="现金";
						
						var promises=[];
						promises.push(searchRef(debitStr));
						promises.push(searchRef(creditStr));
						
						promisesAll.push(
							Parse.Promise.when(promises).then(function(debitRef, creditRef){
								self.set("amount",am);
								self.set("debitRef",debitRef);
								self.set("creditRef",creditRef);
								
								self.set("returnCode","100");
								
								//console.log("parseDescription: amount: "+self.get("amount"));
								//console.log("parseDescription: debitRef: "+self.get("debitRef"));
								//console.log("parseDescription: creditRef: "+self.get("creditRef"));
								
								return Parse.Promise.as("done");
							})
						);
					}else{//description没有找到数字
						self.set("returnCode", "900");
						promisesAll.push(Parse.Promise.as("not a entry"));
					}
				}
			}else{//description为空
			
			}
			return Parse.Promise.when(promisesAll).then(function(x){
				return Parse.Promise.as(self);
			});
		},
		
		parseCommand: function(){//分析并执行命令
			//console.log("parseCommand is called");
			var self=this;
			var des=self.get("description")+"";
			var cmdStr="not defined";
			var pro=[];
			self.set("returnCode","290");
			
				if (des.length==1){//查询帮助
					self.set("returnCode","210");
					//console.log("help");
					return Parse.Promise.as(self);
				}
				var cmd=des.substr(1);
				//console.log("command is : "+cmd);
				switch(cmd){
					case "收支":
						cmdStr="incomeStatement";
						break;
					case "资产":
						cmdStr="balanceSheet";
						break;
					default:
						//var AccountList=Parse.Object.extend("AccountList");
						var qAccList=new Parse.Query(AccountList);
						qAccList.equalTo("accountName",cmd);
						qAccList.ascending("accountRef");
						pro.push(
							qAccList.find().then(function(qAccList){
								if (qAccList.length>0){
									//console.log("found account with : "+cmd);
									return qAccList[0].fetch();
								}else{
									//console.log(cmd+" : not found");
									return Parse.Promise.error("not found");
								}
							}).then(function(accList){
								cmdStr="acc"+accList.get("accountRef");
								if (cmdStr.length>6) cmdStr="not defined";
								return Parse.Promise.as("found");
							},function(error){
								return Parse.Promise.as(error);
							})
						);
						break;
				}
				pro.push(Parse.Promise.as("command"));
			return Parse.Promise.when(pro).then(function(message){
				//console.log("command string is : "+cmdStr);
				if (cmdStr!="not defined"){//生成报表
					self.set("reportRef",cmdStr);
					self.set("returnCode","200");
					//console.log("report reference is set with : "+self.get("reportRef"));
				}
				return Parse.Promise.as(self);
			});
		},
		
		generateReply: function(){//根据returnCode生成回复
			//var AccountList=Parse.Object.extend("AccountList");
			var Reply=Parse.Object.extend("Reply");
			var reply=new Reply();
			var self=this;
			var promises=[];
			switch (self.get("returnCode")){
				case "100"://用户输入符合记账规范的情况
					var tmpStr="已记录：";//生成回复字符串
					
					var pro=[];
					var q1= new Parse.Query(AccountList);
					q1.equalTo("accountRef",self.get("creditRef"));
					q1.limit(1);
					pro.push(
						q1.find().then(function(q){
							return q[0].fetch();
						})
					);
					var q2=new Parse.Query(AccountList);
					q2.equalTo("accountRef",self.get("debitRef"));
					q2.limit(1);
					pro.push(
						q2.find().then(function(q){
							return q[0].fetch();
						})
					);
					
					promises.push(
						Parse.Promise.when(pro).then(function(credit, debit){
							tmpStr+=credit.get("accountName");
							tmpStr+=" 支付 "+self.get("amount")+" 元 ";
							tmpStr+=debit.get("accountName");
							
							//将回复添加到类中
							reply.set("msgType","text");
							reply.set("text",tmpStr);
							return reply.save()
						}).then(function(reply){
							self.set("reply",reply);
							//console.log("saved reply= "+tmpStr);
							return Parse.Promise.as("new entry");
						})
					);
					break;
				case "200"://用户输入为报表查询的情况
					//console.log("generating report");
					promises.push(
						XMReport.getReport(self).then(function(report){
							//console.log("generating reply.  report is a "+typeof(report));
							reply.set("msgType","report");
							reply.set("report",report);
							return reply.save();
						}).then(function(reply){
							self.set("reply",reply);
							//console.log("report is set");
							return Parse.Promise.as("got report");
						})
					);
					break;
				case "210"://帮助信息
					//将回复添加到类中
					reply.set("msgType","help");
					reply.set("help","帮助信息");
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							//console.log("here save reply");
							return Parse.Promise.as("help");
						})
					);
					break;
				case "220"://没有查询到报表到情况
					reply.set("msgType","text");
					reply.set("text","还没有这个报表哟");
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							//console.log("report is set to not found");
							return Parse.Promise.as("report not found");
						})
					);
					break;
				case "290"://不能识别的命令
					//将回复添加到类中
					reply.set("msgType","text");
					reply.set("text","抱歉！没能理解您的意思。请回复“？”获取帮助。");
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							//console.log("here save reply");
							return Parse.Promise.as("command not found");
						})
					);
					break;
				case "900"://用户输入为不能识别的情况
					//将回复添加到类中
					reply.set("msgType","text");
					reply.set("text",self.get("description")+"  抱歉！我不会聊天。请尝试输入类似\"20 星巴克\"这样的文字来记账。");
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							//console.log("here save reply");
							return Parse.Promise.as("not defined usage");
						})
					);
					//console.log("Return Code= 200；reply= "+reply.get("text"));
					break;
				default:
					reply.set("msgType","text");
					reply.set("text",self.get("description"));
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							return Parse.Promise.as("not defined return code");
						})
					);
					//console.log("Return Code not set");
					break;
			}
			//console.log(promises[0]);
			return Parse.Promise.when(promises).then(function(x){
				//console.log("here end generate reply");
				return Parse.Promise.as(self);
			});
		},
		
		updateReport: function(){//更新报表
			var qReport=new Parse.Query(XMReport);
			var self=this;
			
			if (self.get("returnCode")!="100") return Parse.Promise.as(self);//如果该输入内容不是记账命令，则跳过本函数
			
			qReport.equalTo("date",XMReport.nowMonth(0));
			qReport.equalTo("user",self.get("user"));
			
			return qReport.find().then(function(qReport){
				if (qReport.length){//返回已存在的报表
					//console.log("Existing report");
					return qReport[0].fetch();
				}else{//创建一个新报表
					var userReport=new XMReport();
					userReport.set("user",self.get("user"));
					userReport.set("date",XMReport.nowMonth(0));
					//console.log("New report with date: "+userReport.get("date"));
					return Parse.Promise.as(userReport);
				}
			}).then(function(userReport){
				return userReport.recordEntry(self);
			}).then(function(userReport){
				return userReport.save();
			}).then(function(userReport){
				//console.log("Report is saved");
				return self.setUserLastAction();
			}).then(function(message){
				return Parse.Promise.as(self);
			});
		},
		
		setUserLastAction: function(){
			var user=this.get("user");
			return user.fetch().then(function(user){
				user.set("lastAction",XMReport.nowMonth(0));
				return user.save();
			}).then(function(user){
				return Parse.Promise.as("last action is set");
			});
		},
		
		getUserLastAction: function(){
			var user=this.get("user");
			return user.fetch().then(function(user){
				return Parse.Promise.as(user.get("lastAction"));
			});
		}
	},{//class methods
	
	});
	
    
	//---------------------------------------------------------------
	//用户报表类
	var XMReport = Parse.Object.extend("XMReport",{//instance methods
		recordEntry:function(entry){//处理用户记录
			var self=this;
			//console.log("recordEntry is called");
			return entry.getUserLastAction().then(function(lastAction){
				return self.inheritBalance(lastAction);
			}).then(function(message){
				var debitRef="acc"+entry.get("debitRef");
				var creditRef="acc"+entry.get("creditRef");
				self.record(debitRef, entry.get("amount"));
				self.record(creditRef, -entry.get("amount"));
				
				return Parse.Promise.as(self);
			})
		},
		
		record: function(accountRef, amount){//将金额记录入各相关科目
			var self=this;
			
			var l=accountRef.length;
			//console.log("l= "+l+" ;  accountRef is a "+typeof(accountRef));
			while (l>3){
				var ref=accountRef.substr(0,l);
				//console.log("Recording:  "+ref+"  :  "+amount);
				if (isNaN(self.get(ref))) {
					self.set(ref, amount);
				} else {
					self.set(ref, self.get(ref)+amount);
				}
				l-=2;
			}
			
			//console.log(accountRef+"  :  "+amount+" is recorded");
		},
		
		inheritBalance: function(lastAction){//从最近一期报表中继承资产和负债余额
			var self=this;
			var promises=[];
			
			//console.log("inheritBalance is called");
			if (isNaN(lastAction)) return Parse.Promise.as("New User");//如果lastActMonth未定义（新用户）则跳出
			//console.log("this is not a new user");
			if (lastAction==XMReport.nowMonth(0)) return Parse.Promise.as("Existing Monthly Report");//如果不是新一月报表则跳出
			//console.log("this is a new monthly report");
			
			var qReport=new Parse.Query(XMReport);
			//console.log("last action = "+lastAction);
			qReport.equalTo("date",lastAction);
			qReport.equalTo("user",self.get("user"));
			promises.push(
				qReport.find().then(function(qReport){//找到最近一期报表
					return qReport[0].fetch();
				})
			);
			
			var List=Parse.Object.extend("List");//取得科目清单
			var qList=new Parse.Query(List);
			promises.push(
				qList.get("HTmdZZX20E").then(function(list){
					return list.fetch();
				})
			);
			
			return Parse.Promise.when(promises).then(function(lastReport, list){
				var BS=list.get("BS");//只继承资产负责表
				//console.log("type of BS is "+typeof(BS));
				for (i in BS){
					//console.log("trying : "+BS[i]);
					if (lastReport.has(BS[i])){
						self.set(BS[i], lastReport.get(BS[i]));
						//console.log("inherited: "+BS[i]+"   ---   "+self.get(BS[i]));
					}
				}
				//console.log("New Monthly Report inherited");
				return Parse.Promise.as("New Monthly Report inherited");
			});
		}
	},{//class methods
		nowMonth: function(offset){//取得报告的格式日期
			var d=new Date();
			var dStr=d.getFullYear()+"";
			if (d.getMonth()<9) dStr+="0";
			if (isNaN(offset)) {set=0;} else {set=Number(offset);}
			dStr+=d.getMonth()+1+set;
			//console.log("nowMonth: "+dStr);
			return dStr;
		},
		
		getReport: function(entry){//生成回复用的报表
			//console.log("getReport is called");
			var user=entry.get("user");
			var reportRef=entry.get("reportRef");
			var promises=[];
			var report=[];
			var FUser=Parse.Object.extend("FUser");
			
			//取得最近一期报表
			var qReport=new Parse.Query(XMReport);
			promises.push(
				entry.getUserLastAction().then(function(lastAction){
					qReport.equalTo("user",user);
					qReport.equalTo("date",lastAction);
					//console.log((user instanceof FUser)+"    "+lastAction);
					return qReport.find();
				}).then(function(qReport){
					if (qReport.length>0){
						//console.log("report fetched");
						return qReport[0].fetch();
					}else{
						//console.log("report not found");
						return Parse.Promise.error("report not found");
					}
				},function(error){
					//console.log(error);
					return Parse.Promise.as(error);
				})
			);
			
			//取得报表种类清单
			var List=Parse.Object.extend("List");
			var qList=new Parse.Query(List);
			promises.push(
				qList.get("HTmdZZX20E").then(function(qList){
					//console.log("list fetched");
					return qList.fetch();
				})
			);
			
			//生成需要的报表
			return Parse.Promise.when(promises).then(function(userReport, list){
				ref=list.get(reportRef);
				//console.log("report ref is : "+reportRef);
				var pro=[];
				for (i in ref){
					//console.log("trying : "+ref[i]);
					if (userReport.has(ref[i])) {
						//console.log("getting ref : "+ref[i]);
						pro.push(
							ReportAccount.setReportAccount(ref[i].substr(3),userReport.get(ref[i])).then(function(reportAccount){
								report.push(reportAccount);
								//console.log("got : "+reportAccount.get("accountName")+" - "+reportAccount.get("amount"));
								return Parse.Promise.as("done");
							})
						);
					}
				}
				return Parse.Promise.when(pro);
			}).then(function(message){
				//console.log(typeof(report)+" % report : "+report);
				return Parse.Promise.as(report);
			},function(error){
				entry.set("returnCode","220");
				//console.log("report is not found");
				return Parse.Promise.as(error);
			});
		}
	});
	
	
	//-----------------------------------------------------------------------------
	//科目类
	var AccountList=Parse.Object.extend("AccountList",{//instance method
	},{//class method
		getAccountNameByRef: function(ref){
			var qAccList=new Parse.Query(AccountList);
			qAccList.equalTo("accountRef",ref);
			return qAccList.find().then(function(qAccList){
				return qAccList[0].fetch();
			}).then(function(accList){
				return Parse.Promise.as(accList.get("accountName"));
			});
		}
	});
	
	
	//-----------------------------------------------------------------------------
	//报表内容类
	var ReportAccount=Parse.Object.extend("ReportAccount",{//instance method
		
	},{//class method
		setReportAccount: function(ref, amount){
			var reportAccount=new ReportAccount();
			return AccountList.getAccountNameByRef(ref).then(function(accountName){
				reportAccount.set("accountRef","acc"+ref);
				reportAccount.set("accountName",accountName);
				reportAccount.set("amount",amount);
				return reportAccount.save();
			})
		}
	});

	
	//-----------------------------------------------------------------------------
	//微信接口
Parse.Cloud.define("weixinInterface", function(request, response){
	console.log("Cloud Function is called");
	var FUser=Parse.Object.extend("FUser");//创建一个虚拟用户类
	var qUser=new Parse.Query("FUser");
	
	qUser.equalTo("userName",request.params.user);
	qUser.find().then(function(qUser){//判断是否为新用户
		if (qUser.length){//已知用户
			return qUser[0].fetch();
		}else{//新用户*/
			var nUser=new FUser();
			var d=new Date();
			nUser.set("userName",request.params.user);
			nUser.set("creatTime",d);
			return nUser.save();
		}
		
	}).then(function(fUser){//取得并记录用户提交的内容，分析用户输入内容
		var userEntry=new XMEntry();
		userEntry.set("user", fUser);
		userEntry.set("source", request.params.source);
		userEntry.set("description", request.params.content);
		return userEntry.parseDescription();
		
	}).then(function(userEntry){//记录报表、生成回复，并发
		var pro=[];
		pro.push(userEntry.updateReport());
		pro.push(userEntry.generateReply());
		return Parse.Promise.when(pro);
		
	}).then(function(userEntry){//储存
		return userEntry.save()
		
	}).then(function(userEntry){//回复用户
		console.log("Cloud Function completed");
		response.success(userEntry.get("reply"));
		
	},function(error){
		response.error(error);
	});

});


//--------------------------------------------------------
//增加mapping后，修改userEntry及userReport
Parse.Cloud.define("refreshEntry", function(request, response){
	var preDebitRef="";
	var preCreditRef="";
	var preAmount=0;
	
	var qDebit= new Parse.Query(XMEntry);
	qDebit.equalTo("debitRef","99999");
	var qCredit=new Parse.Query(XMEntry);
	qCredit.equalTo("creditRef","99999");
	var qUserEntry=Parse.Query.or(qDebit, qCredit);
	
	qUserEntry.find().then(function(qUserEntry){
		var promises=[];
		for (i in qUserEntry){
			promises.push(updateEntryAndReport(qUserEntry[i]));
		}
		return Parse.Promise.when(promises);
	}).then(function(messages){
		response.success("done");
	});
});

function updateEntryAndReport(userEntry){
	var preDebitRef="";
	var nowDebitRef="";
	var preCreditRef="";
	var nowCreditRef="";
	var preAmount=0;
	
	return userEntry.fetch().then(function(userEntry){
		preDebitRef=userEntry.get("debitRef");
		preCreditRef=userEntry.get("creditRef")
		preAmount=userEntry.get("amount");
		//重新parseDescription
		return userEntry.parseDescription();
	}).then(function(userEntry){
		nowDebitRef=userEntry.get("debitRef");
		nowCreditRef=userEntry.get("creditRef");
		if (preDebitRef==nowDebitRef && preCreditRef==nowCreditRef){//如果没有变化则跳出
			return Parse.Promise.error("not modified");
		}
		//冲销报表中的原记录
		userEntry.set("amount", -preAmount);
		userEntry.set("debitRef",preDebitRef);
		userEntry.set("creditRef",preCreditRef);
		return userEntry.updateReport();
	}).then(function(userEntry){
		//以新ref记录进报表中
		userEntry.set("amount", preAmount);
		userEntry.set("debitRef",nowDebitRef);
		userEntry.set("creditRef",nowCreditRef);
		return userEntry.updateReport();
	}).then(function(userEntry){
		return userEntry.save();
	},function(error){
		return Parse.Promise.as(error);
	});
}
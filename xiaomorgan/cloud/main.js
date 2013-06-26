	//查找语句对应accountRef
	//输入：str
	//输出：accountRef
	//算法：穷举词组匹配mapping表
	function searchRef(str){
		str=str+"";
		var promises=[];
		var l=str.length;
		var r="99999";//未定义的暂存科目
		var Mapping=Parse.Object.extend("Mapping");
		
		if (l==1){//str长度为1，用equalTo进行查询
			var q=new Parse.Query(Mapping);
			q.equalTo("keyWords",str);
			console.log("searchRef: keywords= "+str);
			promises.push(
				q.find().then(function(results){
					if(results.length){
						return results[0].fetch();
					}else
						return Parse.Promise.error("Not Found");//未定义的暂存科目
				}).then(function(result){
						console.log("searchRef found with: "+result.get("accountRef"));
						r=result.get("accountRef");
						return Parse.Promise.as("found");
				},function(error){
					console.log(error);
					return Parse.Promise.as(error);
				})
			);
		}else{//str长度超过1，用最小长度为2的字符串进行startsWith查询，效率较高
			for (var i=l;i>1;i--){
				for (var j=0;j<l-i+1;j++){
					var q=new Parse.Query(Mapping);
					q.startsWith("keyWords",str.substr(j,i));
					console.log("searchRef: keywords= "+str.substr(j,i));
					//q.limit(1);
					promises.push(
						q.find().then(function(results){
							console.log("searchRef found "+results.length+" results");
							if(results.length){
								return results[0].fetch();
							}else return Parse.Promise.error("Not Found");
						}).then(function(result){
							console.log("searchRef found with: "+result.get("accountRef"));
							r=result.get("accountRef");
							return Parse.Promise.as("found");
						},function(error){
							console.log(error);
							return Parse.Promise.as(error);
						})
					);
				}
			}
		}
		return Parse.Promise.when(promises).then(function(x){
			console.log("result of "+str+" is "+r);
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
			
			console.log("parDescription: description= "+des);
			
			if (des.length>0){//des不为空
				var desArr=des.split(" ");//用空格拆分
				if (desArr.length==1){//des没有空格
					if (isNaN(desArr[0])){//des没有空格且不为数字
						self.set("returnCode","200");
					}else{//des只有数字，为默认现金支出其他消费
						var promises=[];
						promises.push(searchRef("其他"));
						promises.push(searchRef("现金"));
						
						promisesAll.push(
							Parse.Promise.when(promises).then(function(debitRef, creditRef){
								self.set("amount",Number(desArr[0]));
								self.set("debitRef",debitRef);
								self.set("creditRef",creditRef);
								
								self.set("returnCode","100");
								
								console.log("parseDescription: descriptioni is a number: "+self.get("amount"));
								console.log("parseDescription: debitRef: "+self.get("debitRef"));
								console.log("parseDescription: creditRef: "+self.get("creditRef"));
								
								return Parse.Promise.as("done");
							})
						);
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
						console.log("parseDescription: desArr["+i+"] = "+desArr[i])+" f= "+f;
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
								
								console.log("parseDescription: amount: "+self.get("amount"));
								console.log("parseDescription: debitRef: "+self.get("debitRef"));
								console.log("parseDescription: creditRef: "+self.get("creditRef"));
								
								return Parse.Promise.as("done");
							})
						);
					}else{
						self.set("returnCode","200");
					}
				}
			}else{//description为空
			
			}
			return Parse.Promise.when(promisesAll).then(function(x){
				return Parse.Promise.as(self);
			});
		},
		
		generateReply: function(){//根据returnCode生成回复
			var AccountList=Parse.Object.extend("AccountList");
			var Reply=Parse.Object.extend("Reply");
			var reply=new Reply();
			var self=this;
			var promises=[];
			switch (self.get("returnCode")){
				case "100"://用户输入符合记账规范的情况
					var tmpStr="";//生成回复字符串
					var q= new Parse.Query(AccountList);
					q.equalTo("accountRef",self.get("creditRef"));
					q.limit(1);
					promises.push(
						q.find().then(function(q){
							return q[0].fetch();
						}).then(function(q){
							tmpStr+=q.get("accountName");
							console.log("creditName= "+q.get("accountName"));
							return Parse.Promise.as("done");
						}).then(function(x){
							tmpStr+=" 支付 "+self.get("amount")+" 元 ";
							var q=new Parse.Query(AccountList);
							q.equalTo("accountRef",self.get("debitRef"));
							q.limit(1);
							return q.find()
						}).then(function(q){
							return q[0].fetch();
						}).then(function(q){
							tmpStr+=q.get("accountName");
							console.log("debitName= "+q.get("accountName"));
							return Parse.Promise.as("done");
						}).then(function(x){
							//将回复添加到类中
							reply.set("msgType","text");
							reply.set("text","已记录："+tmpStr);
							return reply.save()
						}).then(function(reply){
							self.set("reply",reply);
							console.log("saved reply= "+tmpStr);
							return Parse.Promise.as("done");
						})
					);
					break;
				case "200"://用户输入不符合记账规范的情况
					//将回复添加到类中
					reply.set("msgType","text");
					reply.set("text",self.get("description")+"  我不会聊天。请尝试输入类似\"20 星巴克\"这样的文字来记账。");
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							console.log("here save reply");
							return Parse.Promise.as("done");
						})
					);
					console.log("Return Code= 200；reply= "+reply.get("text"));
					break;
				default:
					reply.set("msgType","text");
					reply.set("text",self.get("description"));
					promises.push(
						reply.save().then(function(reply){
							self.set("reply",reply);
							return Parse.Promise.as("done");
						})
					);
					console.log("Return Code not set");
					break;
			}
			//console.log(promises[0]);
			return Parse.Promise.when(promises).then(function(x){
				console.log("here end generate reply");
				return Parse.Promise.as(self);
			});
		}
	},{//class methods
	
	});
	
    
	//---------------------------------------------------------------
	//用户报表类
	var XMReport = Parse.Object.extend("XMReport",{//instance methods
	
	},{//class methods
		recordEntry: function(entry){//将记录登入报告科目
			
		}
	});
	
	
	//-----------------------------------------------------------------------------
	//微信接口
Parse.Cloud.define("weixinInterface", function(request, response){
	var FUser=Parse.Object.extend("FUser");//创建一个虚拟用户类
	var qUser=new Parse.Query("FUser");
	
	qUser.equalTo("userName",request.params.user);
	qUser.find().then(function(qUser){//判断是否为新用户
		if (qUser.length){//已知用户
			return qUser[0].fetch();
		}else{//新用户*/
			var nUser=new FUser();
			nUser.set("userName",request.params.user);
			nUser.set("creatTime",Date());
			return nUser.save();
		}
	}).then(function(fUser){//取得并记录用户提交的内容，分析用户输入内容
		var userEntry=new XMEntry();
		userEntry.set("user", fUser);
		userEntry.set("source", request.params.source);
		userEntry.set("description", request.params.content);
		return userEntry.parseDescription();
	}).then(function(userEntry){//生成回复内容
		return userEntry.generateReply();
	}).then(function(userEntry){//储存
		return userEntry.save()
	}).then(function(userEntry){//回复用户
		response.success(userEntry.get("reply"));
	},function(error){
		response.error(error);
	});

});
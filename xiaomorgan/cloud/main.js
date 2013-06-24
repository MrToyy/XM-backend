	//查找语句对应accountRef
	//输入：str
	//输出：accountRef
	//算法：穷举词组匹配mapping表
	function searchRef(str){
		str=str+"";
		var l=str.length;
		var f=false;
		var Mapping=Parse.Object.extend("Mapping");
		if (l==1){//str长度为1，用equalTo进行查询
			var q=new Parse.Query(Mapping);
			q.equalTo("keyWords",str);
			q.find().then(function(results){
				if(results.length){
					return results[0].get("accountRef");
				}else{
					return "99999";//未定义的暂存科目
				}
			});
		}else{//str长度超过1，用最小长度为2的字符串进行startsWith查询，效率较高
			for (var i=l;i>1;i--){
				for (var j=0;j<l-i+1;j++){
					var q=new Parse.Query(Mapping);
					q.startsWith("keyWords",str.substr(j,i));
					q.limit(1);
					q.find().then(function(results){
						if(results.length){
							return results[0].get("accountRef");
						}
					});
				}
			}
			return "99999";//未定义的暂存科目
		}
	}
	
	
	//--------------------------------------------------------------------------
	//用户记录类
	var XMEntry = Parse.Object.extend("XMEntry",{
		//instance methods
		parseDescription: function(){//description为记账命令时调用
			//var Journal = Parse.Object.extend("Journals");//日记账类，作为XMEntry.journals的元素
			var des=this.get("description")+"";
			if (des.length>0){//des不为空
				var desArr=des.split(" ");//用空格拆分
				if (desArr.length==1){//des没有空格
					if (Number(desArr[0])==NaN){//des没有空格且不为数字
						this.set("returnCode","200");
					}else{//des只有数字，为默认现金支出其他消费
						this.set("amount",Number(desArr[0]));
						this.set("debitRef",searchRef("其他"));
						this.set("creditRef",searchRef("现金"));
						
						/*var debitJournal = new Journal();
						debitJournal.set("amount",desArr);
						debitJournal.set("accountRef",searchRef("其他"));
						this.add("journals",debitJournal);
						
						var creditJournal = new Journal();
						creditJournal.set("amount",-desArr);
						creditJournal.set("accountRef",searchRef("现金"));
						this.add("journals",creditJournal);*/
						
						this.set("returnCode","100");
						
						//this.set("tmpStr",accountList.get(this.get("creditRef"))+"支付"+desArr+"元"+accountList.get(this.get("debitRef")));
						
						/*debitJournal.destroy();
						creditJournal.destroy();*/
					}
				}else{//des拆分数量多于一个
					var f=false, debitStr="", creditStr="";
					for (var i=0;i<desArr.length;i++){//寻找第一个数字，该数字左边为贷方表述，右边为借方表述
						if (Number(desArr[i])!=NaN || f ){
							if (f){
								debitStr=debitStr+desArr[i];
							}else{
								creditStr=creditStr+desArr[i];
							}
						}else{
							f=true;
							var am=Number(desArr[i]);
						}
					}
					if (f){//找到了数字的情况，查找ref，没有则默认为现金支出其他消费
						if (debitStr=="") debitStr="其他";
						if (creditStr=="") creditStr="现金";
						this.set("amount",am);
						this.set("debitRef",searchRef(debitStr));
						this.set("creditRef",searchRef(creditStr));
						
						/*var debitJournal = new Journal();
						debitJournal.set("amount",am);
						debitJournal.set("accountRef",searchRef(debitStr));
						this.add("journals",debitJournal);
						
						var creditJournal = new Journal();
						creditJournal.set("amount",-am);
						creditJournal.set("accountRef",searchRef(creditStr));
						this.add("journals",creditJournal);*/
						
						this.set("returnCode","100");
						
						//this.set("tmpStr",accountList.get(this.get("creditRef"))+"支付"+am+"元"+accountList.get(this.get("debitRef")));
						
						/*debitJournal.destroy();
						creditJournal.destroy();*/
					}else{
						this.set("returnCode","200");
					}
				}
			}else{//description为空
			
			}
		},
		
		generateReply: function(){//根据returnCode生成回复
			var Reply=Parse.Object.extend("Reply");
			var reply=new Reply();
			var self=this;
			switch (self.get("returnCode")){
				case "100":
					reply.set("msgType","text");
					reply.set("text","已记录："+self.get("tmpStr"));
					reply.save().then(function(reply){
						self.set("reply",reply);
					});
					break;
				case "200":
					
					break;
				default:
					reply.set("msgType","text");
					reply.set("text",self.get("description"));
					reply.save().then(function(reply){
						self.set("reply",reply);
					});
					break;
			}
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
	}).then(function(fUser){//取得并记录用户提交的内容
		var userEntry=new XMEntry();
		userEntry.set("user", fUser);
		userEntry.set("source", request.params.source);
		userEntry.set("description", request.params.content);
		
		userEntry.parseDescription();
		userEntry.generateReply();
		return userEntry.save()
	}).then(function(userEntry){//回复用户
		response.success(userEntry.get("reply"));
	},function(error){
		response.error(error);
	});

	
	/*var userEntry=XMEntry.newEntry(request.params.content, request.params.source);
	userEntry.generateReply();
	userEntry.save().then(function(userEntry){
		response.success( userEntry.get("reply"));
	});*/
	/*Parse.User.logIn(request.params.user, uniPass, {//已知用户
		success: function(user){
			var reply=newEntry(user, request.params.content, request.params.source);
			response.success(reply);
		},
		error: function(user, error){//未知用户，创建一个新用户
			var user=new Parse.User();
			user.set("userName", request.params.user);
			user.set("password", uniPass);
			user.set("createDate",Date());
			
			user.signUp(null, {
				success: function(user){
					var reply=newEntry(user, request.params.content, request.params.source);
					response.success(reply);
				},
				error: function(user, error){
				
				}
			});
		}
	});*/
});
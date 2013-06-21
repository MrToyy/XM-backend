	//查找语句对应accountRef
	//输入：str
	//输出：accountRef
	//算法：穷举词组匹配mapping表
	function searchRef(str){
		str=str+"";
		var l=str.length;
		var f=false;
		var Mapping=Parse.Object.extend("Mapping");
		if (l==1){
			var q=new Parse.Query(Mapping);
			q.equalTo("keyWords",str);
			q.find({
				success: function(results){
					return results.get("accountRef");
				},
				error: function(error){
					return "99999";//未定义的暂存科目
				}
			});
		}else{
			for (var i=l;i>1;i--){
				for (var j=0;j<l-i+1;j++){
					var q=new Parse.Query(Mapping);
					q.startWith("keyWords",str.substr(j,i));
					q.find({
						success: function(results){
							return results.get("accountRef");
						},
						error: function(error){
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
			var Journal = Parse.Object.extend("Journals");//日记账类，作为XMEntry.journals的元素
			var des=this.get("description")+"";
			if (des.length>0){
				var desArr=des.split(" ");
				if (desArr.length==1){
					if (isNaN(desArr)){
						this.set("returnCode","200");
					}else{
						this.set("amount",desArr);
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
						
						this.set("tmpStr",accountList.get(this.get("creditRef"))+"支付"+desArr+"元"+accountList.get(this.get("debitRef")));
						
						/*debitJournal.destroy();
						creditJournal.destroy();*/
					}
				}else{
					var f=false, debitStr="", creditStr="";
					for (var i=0;i<desArr.length;i++){
						if (isNaN(desArr[i]) || f ){
							if (f){
								debitStr=debitStr+desArr[i];
							}else{
								creditStr=creditStr+desArr[i];
							}
						}else{
							f=true;
							var am=desArr[i];
						}
					}
					if (f){
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
						
						this.set("tmpStr",accountList.get(this.get("creditRef"))+"支付"+am+"元"+accountList.get(this.get("debitRef")));
						
						/*debitJournal.destroy();
						creditJournal.destroy();*/
					}else{
						this.set("returnCode","200");
					}
				}
			}else{//description为空
			
			}
		}
		
		generateReply: function(){//根据returnCode生成回复
			switch (this.get("returnCode")){
				case "100":
					var Reply=Parse.Object.extend("Reply");
					var reply=new reply();
					reply.set("msgType","text");
					reply.set("text","已记录："+this.get("tmpStr"));
					this.set("reply",reply);
					reply.destroy();
					break;
				case "200":
					
					break;
				default:
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
	
	
	//处理用户输入，输出回复
	function newEntry(user, des, source){
		var userEntry=new XMEntry();
		userEntry.set("user", user);
		userEntry.set("source", source);
		userEntry.set("description", des);
		
		if (des.substr(0,1)="?" || des.substr(0,1)="？"){//用户指令
			
		}else{//用户日记账
			userEntry.parseDescription();
			userEntry.generateReply();
			
			//var userReport= XMReport.recordEntry(userEntry);
			//userReport.save();
			
			userEntry.save(null,{
				success: function(userEntry){
					return userEntry.reply;
				},
				error: function(error){
					
				}
			});
		}
		
		userEntry.save(null,{
			success: function(userEntry){
			
			},
			error: function(error){
			
			}
		});
	}
	
	
	//-----------------------------------------------------------------------------
	//微信接口
	Parse.Cloud.define("weixinInterface", function(request, response){
	var uniPass="54grUEk8"
	
	Parse.User.logIn(request.params.user, uniPass, {//已知用户
		success: function(user){
			var reply=newEntry(user, request.params.content, request.params.source);
			response.success(reply);
		},
		error: function(user, error){//未知用户，创建一个新用户
			var user=new Parse.User();
			user.set("username", request.params.user);
			user.set("password", uniPass);
			
			user.signUp(null, {
				success: function(user){
					var reply=newEntry(user, request.params.content, request.params.source);
					response.success(reply);
				},
				error: function(user, error){
				
				}
			});
		}
	});
});
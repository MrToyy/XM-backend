	
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
	
	
	var XMEntry = Parse.Object.extend("XMEntry",{//instance methods
		parseDescription: function(){
			var Journal = Parse.Object.extend("Journals");//日记账类，作为XMEntry.journals的元素
			var des=this.get("description")+"";
			if (des.length>0){
				var desArr=des.split(" ");
				if (desArr.length==1){
					if (isNaN(desArr)){
						this.set("returnCode","200");
					}else{
						var debitJournal = new Journal();
						debitJournal.set("amount",desArr);
						debitJournal.set("accountRef",searchRef("其他"));
						this.add("journals",debitJournal);
						
						var creditJournal = new Journal();
						creditJournal.set("amount",-desArr);
						creditJournal.set("accountRef",searchRef("现金"));
						this.add("journals",creditJournal);
						
						this.set("returnCode","100");
						
						debitJournal.destroy();
						creditJournal.destroy();
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
						var debitJournal = new Journal();
						debitJournal.set("amount",am);
						debitJournal.set("accountRef",searchRef(debitStr));
						this.add("journals",debitJournal);
						
						if (creditStr=="") creditStr="现金";
						var creditJournal = new Journal();
						creditJournal.set("amount",-am);
						creditJournal.set("accountRef",searchRef(creditStr));
						this.add("journals",creditJournal);
						
						this.set("returnCode","100");
						
						debitJournal.destroy();
						creditJournal.destroy();
					}else{
						this.set("returnCode","200");
					}
				}
				switch (this.get("returnCode")){
					case "100":
						var userReport= new XMReport();
						userReport.recordEntry(this);
						userReport.save(null,{
							success: function(result){
								
							},
							error: function(error){
								
							}
						});
						break;
					case "200":
						
						break;
					default:
						break;
				}
			}else{//description为空
			
			}
		}
	},{//class methods
	
	});
	
    var XMReport = Parse.Object.extend("XMReport",{
		recordEntry: function(entry){
		
		}
	},{
	
	});
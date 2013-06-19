	var Journal = Parse.Object.extend("Journals");
	
	var XMEntry = Parse.Object.extend("XMEntry",{//instance methods
		parseDescription: function(){
			var des=new string(this.get("description"));
			if (des.length>0){
				var desArr=des.split(" ");
				if (desArr.length==1){
					if (isNaN(desArr[0])){
						this.set("returnCode","200");
					}else{
						var debitJournal = new Journal();
						debitJournal.set("amount",desArr[0]);
						debitJournal.set("accountRef",searchRef("其他"));
						this.add("journals",debitJournal);
						
						var creditJournal = new Journal();
						creditJournal.set("amount",-desArr[0]);
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
						var debitJournal = new Journal();
						debitJournal.set("amount",am);
						debitJournal.set("accountRef",searchRef(debitStr));
						this.add("journals",debitJournal);
						
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
# SilverEra

白银接口：https://api.jisuapi.com/silver/shgold?appkey=**\*\***

参数名称 类型 说明
type string 品种代号
typename string 品种名称
price string 最新价
openingprice string 开盘价
maxprice string 最高价
minprice string 最低价
changepercent string 涨跌幅
lastclosingprice string 昨收盘价
tradeamount string 总成交量
updatetime string 更新时间

JSON返回示例 :

{
"status": 0,
"msg": "ok",
"result": [
{
"type": "Ag(T+D)",
"typename": "白银延期",
"price": "3399.00",
"openingprice": "3402.00",
"maxprice": "3407.00",
"minprice": "3388.00",
"changepercent": "0.09%",
"lastclosingprice": "3396.00",
"tradeamount": "1373982.0000",
"updatetime": "2015-10-27 15:07:25"
},
{
"type": "Ag99.99",
"typename": "白银9999",
"price": "3402.00",
"openingprice": "3405.00",
"maxprice": "3405.00",
"minprice": "3402.00",
"changepercent": "0.03%",
"lastclosingprice": "3401.00",
"tradeamount": "60.0000",
"updatetime": "2015-10-27 13:59:11"
}
]
}

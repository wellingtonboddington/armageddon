/* MIDNIGHT PROTOCOL — flags: simplified procedural renderings of real national flags plus a
   custom flag builder. Spec DSL: "base|overlay|overlay..." — see drawSpec(). */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U;
  const F = (MP.Flags = {});

  const RAW = `
AF|Afghanistan|v:000,d32011,007a36|ring:fff@0.5,0.5,0.13
AL|Albania|f:e41e20|bird:000@0.5,0.5,0.32
DZ|Algeria|v:006233,fff|crescent:d21034@0.52,0.5,0.24|star:d21034@0.58,0.5,0.09
AD|Andorra|v:10069f,fedf00,d50032|shield:c7b37f@0.5,0.5,0.16
AO|Angola|h:cc092f,000|gear:ffcb00@0.5,0.5,0.2
AG|Antigua and Barbuda|f:ce1126|poly:000@0,0,1,0,0.5,1|poly:0072c6@0.2,0.4,0.8,0.4,0.5,1|poly:fff@0.33,0.7,0.67,0.7,0.5,1|sun:fcd116@0.5,0.3,0.12
AR|Argentina|h:74acdf,fff,74acdf|sun:f6b40e@0.5,0.5,0.1
AM|Armenia|h:d90012,0033a0,f2a800
AU|Australia|f:00008b|ujack|star:fff@0.25,0.75,0.11|star:fff@0.75,0.22,0.05|star:fff@0.63,0.47,0.05|star:fff@0.87,0.42,0.05|star:fff@0.75,0.8,0.06
AT|Austria|h:ed2939,fff,ed2939
AZ|Azerbaijan|h:00b5e2,ef3340,509e2f|crescent:fff@0.48,0.5,0.15|star:fff@0.57,0.5,0.06
BS|Bahamas|h:00abc9,fae042,00abc9|tri:000@0.42
BH|Bahrain|f:ce1126|rect:fff@0,0,0.28,1
BD|Bangladesh|f:006a4e|disc:f42a41@0.45,0.5,0.3
BB|Barbados|v:00267f,ffc726,00267f|trident:000@0.5,0.5,0.28
BY|Belarus|hw:c8313e:2,4aa657:1|rect:fff@0,0,0.1,1|rect:c8313e@0.03,0,0.04,1
BE|Belgium|v:000,fdda24,ef3340
BZ|Belize|hw:ce1126:1,003f87:8,ce1126:1|disc:fff@0.5,0.5,0.28|leaf:2f7d32@0.5,0.5,0.18
BJ|Benin|h:fcd116,e8112d|rect:008751@0,0,0.4,1
BT|Bhutan|f:ffd520|poly:ff4e12@1,0,1,1,0,1|dragon:fff@0.5,0.5,0.3
BO|Bolivia|h:d52b1e,f9e300,007934
BA|Bosnia and Herzegovina|f:002395|poly:fecb00@0.25,0,0.75,0,0.75,1|star:fff@0.2,0.1,0.04|star:fff@0.3,0.3,0.04|star:fff@0.4,0.5,0.04|star:fff@0.5,0.7,0.04|star:fff@0.6,0.9,0.04
BW|Botswana|hw:6da9d2:9,fff:1,000:4,fff:1,6da9d2:9
BR|Brazil|f:009c3b|poly:ffdf00@0.08,0.5,0.5,0.1,0.92,0.5,0.5,0.9|disc:002776@0.5,0.5,0.21|rect:fff@0.3,0.47,0.4,0.05
BN|Brunei|f:f7e017|poly:fff@0,0.18,1,0.55,1,0.75,0,0.38|poly:000@0,0.38,1,0.75,1,0.92,0,0.55|disc:cf1126@0.5,0.5,0.14
BG|Bulgaria|h:fff,00966e,d62612
BF|Burkina Faso|h:ef2b2d,009e49|star:fcd116@0.5,0.5,0.15
BI|Burundi|f:ce1126|poly:1eb53a@0,0,0,1,0.5,0.5|poly:1eb53a@1,0,1,1,0.5,0.5|saltire:fff|disc:fff@0.5,0.5,0.24|star:ce1126@0.5,0.42,0.05|star:ce1126@0.44,0.55,0.05|star:ce1126@0.56,0.55,0.05
KH|Cambodia|hw:032ea1:1,e00025:2,032ea1:1|temple:fff@0.5,0.5,0.22
CM|Cameroon|v:007a5e,ce1126,fcd116|star:fcd116@0.5,0.5,0.12
CA|Canada|vw:d80621:1,fff:2,d80621:1|leaf:d80621@0.5,0.5,0.24
CV|Cabo Verde|hw:003893:6,fff:1,cf2027:1,fff:1,003893:3|starsring:f7d116@10,0.38,0.62,0.18
CF|Central African Republic|h:003082,fff,289728,ffce00|rect:d21034@0.42,0,0.16,1|star:ffce00@0.12,0.12,0.08
TD|Chad|v:002664,fecb00,c60c30
CL|Chile|h:fff,d52b1e|rect:0039a6@0,0,0.33,0.5|star:fff@0.165,0.25,0.1
CN|China|f:ee1c25|star:ffff00@0.17,0.27,0.13|star:ffff00@0.33,0.1,0.045|star:ffff00@0.4,0.2,0.045|star:ffff00@0.4,0.34,0.045|star:ffff00@0.33,0.44,0.045
CO|Colombia|hw:fcd116:2,003893:1,ce1126:1
KM|Comoros|h:ffc61e,fff,ce1126,3a75c4|tri:3d8e33@0.4|crescent:fff@0.15,0.5,0.15
CG|Republic of the Congo|f:dc241f|poly:009543@0,0,0.7,0,0,1|poly:fbde4a@0.7,0,1,0,0.3,1,0,1
CD|DR Congo|f:007fff|poly:f7d618@0,0.82,0.86,0,1,0,1,0.18,0.14,1,0,1|poly:ce1021@0,0.9,0.92,0,1,0,1,0.1,0.08,1,0,1|star:f7d618@0.15,0.2,0.12
CR|Costa Rica|hw:002b7f:1,fff:1,ce1126:2,fff:1,002b7f:1
CI|Côte d'Ivoire|v:f77f00,fff,009e60
HR|Croatia|h:ff0000,fff,171796|checker:ff0000@0.5,0.45,0.14
CU|Cuba|h:002a8f,fff,002a8f,fff,002a8f|tri:cf142b@0.45|star:fff@0.15,0.5,0.1
CY|Cyprus|f:fff|poly:d57800@0.28,0.42,0.48,0.32,0.72,0.3,0.6,0.42,0.4,0.5|leaf:4e5b31@0.5,0.68,0.12
CZ|Czechia|h:fff,d7141a|tri:11457e@0.5
DK|Denmark|f:c8102e|nordic:fff
DJ|Djibouti|h:6ab2e7,12ad2b|tri:fff@0.45|star:d7141a@0.15,0.5,0.08
DM|Dominica|f:006b3f|cross:fcd116|disc:d41c30@0.5,0.5,0.2|starsring:009e49@10,0.5,0.5,0.15
DO|Dominican Republic|f:fff|rect:002d62@0,0,0.44,0.42|rect:ce1126@0.56,0,0.44,0.42|rect:ce1126@0,0.58,0.44,0.42|rect:002d62@0.56,0.58,0.44,0.42
EC|Ecuador|hw:ffdd00:2,034ea2:1,ed1c24:1|bird:6b4f2f@0.5,0.5,0.14
EG|Egypt|h:ce1126,fff,000|bird:c09300@0.5,0.5,0.13
SV|El Salvador|h:0047ab,fff,0047ab|ring:c09300@0.5,0.5,0.08
GQ|Equatorial Guinea|h:3e9a00,fff,e32118|tri:0073ce@0.25
ER|Eritrea|h:12ad2b,4189dd|poly:ea0437@0,0,1,0.5,0,1|ring:ffc726@0.24,0.5,0.12
EE|Estonia|h:0072ce,000,fff
SZ|Eswatini|hw:3e5eb9:1,ffd900:0.3,b10c0c:2,ffd900:0.3,3e5eb9:1|shield:fff@0.5,0.5,0.16
ET|Ethiopia|h:078930,fcdd09,da121a|disc:0f47af@0.5,0.5,0.2|pent:fcdd09@0.5,0.5,0.14
FJ|Fiji|f:68bfe5|ujack|shield:fff@0.74,0.52,0.16
FI|Finland|f:fff|nordic:002f6c
FR|France|v:002654,fff,ed2939
GA|Gabon|h:009e60,fcd116,3a75c4
GM|Gambia|hw:ce1126:6,fff:1,0c1c8c:4,fff:1,3a7728:6
GE|Georgia|f:fff|cross:ff0000|cross4:ff0000
DE|Germany|h:000,dd0000,ffce00
GH|Ghana|h:ce1126,fcd116,006b3f|star:000@0.5,0.5,0.14
GR|Greece|h:0d5eaf,fff,0d5eaf,fff,0d5eaf,fff,0d5eaf,fff,0d5eaf|rect:0d5eaf@0,0,0.37,0.556|rect:fff@0.148,0,0.074,0.556|rect:fff@0,0.222,0.37,0.111
GD|Grenada|f:ce1126|rect:007a5e@0.08,0.12,0.84,0.76|poly:fcd116@0.08,0.12,0.92,0.12,0.5,0.5|poly:fcd116@0.08,0.88,0.92,0.88,0.5,0.5|disc:ce1126@0.5,0.5,0.1|star:fcd116@0.5,0.5,0.07
GT|Guatemala|v:4997d0,fff,4997d0|ring:6c8d3b@0.5,0.5,0.1
GN|Guinea|v:ce1126,fcd116,009460
GW|Guinea-Bissau|h:fcd116,009e49|rect:ce1126@0,0,0.33,1|star:000@0.165,0.5,0.1
GY|Guyana|f:009e49|poly:fff@0,0,1,0.5,0,1|poly:fcd116@0,0.04,0.93,0.5,0,0.96|poly:000@0,0,0.5,0.5,0,1|poly:ce1126@0,0.06,0.44,0.5,0,0.94
HT|Haiti|h:00209f,d21034|rect:fff@0.38,0.35,0.24,0.3|leaf:016a16@0.5,0.48,0.1
HN|Honduras|h:0073cf,fff,0073cf|star:0073cf@0.5,0.5,0.05|star:0073cf@0.4,0.44,0.04|star:0073cf@0.6,0.44,0.04|star:0073cf@0.4,0.56,0.04|star:0073cf@0.6,0.56,0.04
HU|Hungary|h:ce2939,fff,477050
IS|Iceland|f:02529c|nordic:fff,dc1e35
IN|India|h:ff9933,fff,138808|ring:000080@0.5,0.5,0.1
ID|Indonesia|h:ff0000,fff
IR|Iran|h:239f40,fff,da0000|tulip:da0000@0.5,0.5,0.12
IQ|Iraq|h:ce1126,fff,000|rect:007a3d@0.33,0.46,0.34,0.08
IE|Ireland|v:169b62,fff,ff883e
IL|Israel|hw:fff:1,0038b8:1,fff:5,0038b8:1,fff:1|star6:0038b8@0.5,0.5,0.17
IT|Italy|v:009246,fff,ce2b37
JM|Jamaica|f:009b3a|poly:000@0,0,0.5,0.5,0,1|poly:000@1,0,0.5,0.5,1,1|saltire:fed100
JP|Japan|f:fff|disc:bc002d@0.5,0.5,0.3
JO|Jordan|h:000,fff,007a3d|tri:ce1126@0.45|star:fff@0.15,0.5,0.06
KZ|Kazakhstan|f:00afca|sun:fec50c@0.5,0.44,0.16|bird:fec50c@0.5,0.72,0.1
KE|Kenya|hw:000:3,fff:1,bb0000:3,fff:1,006600:3|shield:bb0000@0.5,0.5,0.18
KI|Kiribati|hw:ce1126:5,fff:1,003f87:1,fff:1,003f87:1,fff:1|sun:fcd116@0.5,0.4,0.15|bird:fcd116@0.5,0.18,0.1
KP|North Korea|hw:024fa2:3,fff:1,ed1c27:10,fff:1,024fa2:3|disc:fff@0.33,0.5,0.16|star:ed1c27@0.33,0.5,0.14
KR|South Korea|f:fff|yy:cd2e3a,0047a0@0.5,0.5,0.22|trigrams:000@0.5,0.5,0.4
KW|Kuwait|h:007a3d,fff,ce1126|poly:000@0,0,0.25,0.33,0.25,0.67,0,1
KG|Kyrgyzstan|f:e8112d|sun:ffef00@0.5,0.5,0.22
LA|Laos|hw:ce1126:1,002868:2,ce1126:1|disc:fff@0.5,0.5,0.2
LV|Latvia|hw:9e3039:2,fff:1,9e3039:2
LB|Lebanon|hw:ed1c24:1,fff:2,ed1c24:1|leaf:00a651@0.5,0.5,0.2
LS|Lesotho|h:00209f,fff,009543|hat:000@0.5,0.5,0.14
LR|Liberia|h:bf0a30,fff,bf0a30,fff,bf0a30,fff,bf0a30,fff,bf0a30,fff,bf0a30|rect:002868@0,0,0.4,0.455|star:fff@0.2,0.23,0.12
LY|Libya|hw:e70013:1,000:2,239e46:1|crescent:fff@0.48,0.5,0.15|star:fff@0.56,0.5,0.06
LI|Liechtenstein|h:002b7f,ce1126|crown:ffd83d@0.22,0.27,0.12
LT|Lithuania|h:fdb913,006a44,c1272d
LU|Luxembourg|h:ed2939,fff,00a1de
MG|Madagascar|h:fc3d32,007e3a|rect:fff@0,0,0.33,1
MW|Malawi|h:000,ce1126,339e35|sun:ce1126@0.5,0.2,0.14
MY|Malaysia|h:cc0001,fff,cc0001,fff,cc0001,fff,cc0001,fff,cc0001,fff,cc0001,fff,cc0001,fff|rect:010066@0,0,0.5,0.57|crescent:fc0@0.19,0.28,0.17|star:fc0@0.32,0.28,0.1
MV|Maldives|f:d21034|rect:007e3a@0.25,0.25,0.5,0.5|crescent:fff@0.52,0.5,0.15
ML|Mali|v:14b53a,fcd116,ce1126
MT|Malta|v:fff,cf142b|cross4:aaa
MH|Marshall Islands|f:003893|poly:dd7500@0,1,1,0.1,1,0.25|poly:fff@0,1,1,0,1,0.1|star:fff@0.2,0.25,0.13
MR|Mauritania|hw:d01c1f:1,00a95c:4,d01c1f:1|crescent:ffd700@0.5,0.42,0.2|star:ffd700@0.5,0.32,0.07
MU|Mauritius|h:ea2839,1a206d,ffd500,00a551
MX|Mexico|v:006847,fff,ce1126|bird:8c5a2b@0.5,0.5,0.13
FM|Micronesia|f:75b2dd|star:fff@0.5,0.25,0.08|star:fff@0.5,0.75,0.08|star:fff@0.3,0.5,0.08|star:fff@0.7,0.5,0.08
MD|Moldova|v:003da5,ffd200,cc092f|bird:8c5a2b@0.5,0.5,0.14
MC|Monaco|h:ce1126,fff
MN|Mongolia|v:c4272f,015197,c4272f|soyombo:f9cf02@0.17,0.5,0.2
ME|Montenegro|f:c40308|frame:d4af37|bird:d4af37@0.5,0.5,0.28
MA|Morocco|f:c1272d|pent:006233@0.5,0.5,0.25
MZ|Mozambique|hw:007168:6,fff:1,000:6,fff:1,fce100:6|tri:d21034@0.45|star:fce100@0.15,0.5,0.12
MM|Myanmar|h:fecb00,34b233,ea2839|star:fff@0.5,0.55,0.3
NA|Namibia|f:009543|poly:003580@0,0,1,0,0,1|poly:fff@0,0.78,0.78,0,1,0,1,0.22,0.22,1,0,1|poly:d21034@0,0.88,0.88,0,1,0,1,0.12,0.12,1,0,1|sun:ffce00@0.2,0.27,0.12
NR|Nauru|hw:002b7f:11,ffc61e:1,002b7f:11|star:fff@0.25,0.75,0.1
NP|Nepal|f:dc143c|frame:003893|sun:fff@0.35,0.72,0.12|crescent:fff@0.35,0.3,0.1
NL|Netherlands|h:ae1c28,fff,21468b
NZ|New Zealand|f:00247d|ujack|star:cc142b@0.75,0.25,0.06|star:cc142b@0.66,0.46,0.06|star:cc142b@0.85,0.42,0.05|star:cc142b@0.75,0.78,0.07
NI|Nicaragua|h:0067c6,fff,0067c6|tri3:0067c6@0.5,0.5,0.09
NE|Niger|h:e05206,fff,0db02b|disc:e05206@0.5,0.5,0.12
NG|Nigeria|v:008751,fff,008751
MK|North Macedonia|f:d20000|rays:ffe600@0.5,0.5,0.2
NO|Norway|f:ba0c2f|nordic:fff,00205b
OM|Oman|hw:fff:1,db161b:1,008000:1|rect:db161b@0,0,0.3,1
PK|Pakistan|f:01411c|rect:fff@0,0,0.25,1|crescent:fff@0.62,0.52,0.25|star:fff@0.71,0.38,0.08
PW|Palau|f:4aadd6|disc:ffde00@0.45,0.5,0.28
PS|Palestine|h:000,fff,007a3d|tri:ce1126@0.4
PA|Panama|f:fff|rect:d21034@0.5,0,0.5,0.5|rect:005293@0,0.5,0.5,0.5|star:005293@0.25,0.25,0.1|star:d21034@0.75,0.75,0.1
PG|Papua New Guinea|f:ce1126|poly:000@0,0,1,1,0,1|bird:fcd116@0.68,0.32,0.16|star:fff@0.22,0.6,0.05|star:fff@0.3,0.75,0.05|star:fff@0.15,0.8,0.05
PY|Paraguay|h:d52b1e,fff,0038a8|ring:2f6d1f@0.5,0.5,0.09
PE|Peru|v:d91023,fff,d91023
PH|Philippines|h:0038a8,ce1126|tri:fff@0.45|sun:fcd116@0.16,0.5,0.1
PL|Poland|h:fff,dc143c
PT|Portugal|vw:006600:2,ff0000:3|ring:ffcc00@0.4,0.5,0.17|shield:ff0000@0.4,0.5,0.1
QA|Qatar|f:8a1538|rect:fff@0,0,0.33,1
RO|Romania|v:002b7f,fcd116,ce1126
RU|Russia|h:fff,0039a6,d52b1e
RW|Rwanda|hw:00a1de:2,fad201:1,20603d:1|sun:fad201@0.82,0.25,0.12
KN|Saint Kitts and Nevis|f:009e49|poly:ce1126@1,0,1,1,0,1|poly:fcd116@0,0.78,0.78,0,1,0,1,0.22,0.22,1,0,1|poly:000@0,0.88,0.88,0,1,0,1,0.12,0.12,1,0,1|star:fff@0.4,0.6,0.07|star:fff@0.6,0.4,0.07
LC|Saint Lucia|f:65cfff|poly:fff@0.5,0.12,0.76,0.88,0.24,0.88|poly:000@0.5,0.24,0.7,0.88,0.3,0.88|poly:fcd116@0.5,0.52,0.76,0.88,0.24,0.88
VC|Saint Vincent|vw:0072c6:1,fcd116:2,009e60:1|diamond:009e60@0.42,0.5,0.08|diamond:009e60@0.58,0.5,0.08|diamond:009e60@0.5,0.65,0.08
WS|Samoa|f:ce1126|rect:002b7f@0,0,0.5,0.5|star:fff@0.25,0.12,0.05|star:fff@0.17,0.27,0.05|star:fff@0.33,0.25,0.05|star:fff@0.25,0.4,0.06
SM|San Marino|h:fff,5eb6e4|shield:f1bf31@0.5,0.5,0.16
ST|São Tomé and Príncipe|hw:12ad2b:1,ffce00:2,12ad2b:1|tri:d21034@0.3|star:000@0.45,0.5,0.08|star:000@0.7,0.5,0.08
SA|Saudi Arabia|f:006c35|script:fff@0.5,0.4,0.3|rect:fff@0.25,0.66,0.5,0.04
SN|Senegal|v:00853f,fdef42,e31b23|star:00853f@0.5,0.5,0.12
RS|Serbia|h:c6363c,0c4076,fff|bird:fff@0.33,0.45,0.15
SC|Seychelles|f:003f87|poly:fcd856@0,1,0.33,0,0.67,0|poly:d62828@0,1,0.67,0,1,0,1,0.33|poly:fff@0,1,1,0.33,1,0.67|poly:007a3d@0,1,1,0.67,1,1
SL|Sierra Leone|h:1eb53a,fff,0072c6
SG|Singapore|h:ef3340,fff|crescent:fff@0.2,0.25,0.15|starsring:fff@5,0.3,0.25,0.08
SK|Slovakia|h:fff,0b4ea2,ee1c25|shield:ee1c25@0.33,0.5,0.17
SI|Slovenia|h:fff,005ce5,ed1c24|shield:005ce5@0.28,0.36,0.12
SB|Solomon Islands|f:0051ba|poly:215b33@1,0,1,1,0,1|poly:fcd116@0,0.95,0.95,0,1,0,1,0.05,0.05,1,0,1|star:fff@0.12,0.15,0.04|star:fff@0.28,0.15,0.04|star:fff@0.2,0.27,0.04|star:fff@0.12,0.38,0.04|star:fff@0.28,0.38,0.04
SO|Somalia|f:4189dd|star:fff@0.5,0.5,0.2
ZA|South Africa|f:007749|rect:e03c31@0,0,1,0.33|rect:002395@0,0.67,1,0.33|poly:fff@0,0,0.14,0,0.52,0.39,1,0.39,1,0.61,0.52,0.61,0.14,1,0,1|poly:007749@0,0.06,0.08,0.06,0.47,0.43,1,0.43,1,0.57,0.47,0.57,0.08,0.94,0,0.94|poly:ffb612@0,0.13,0.4,0.5,0,0.87|poly:000@0,0.2,0.33,0.5,0,0.8
SS|South Sudan|hw:000:6,fff:1,da121a:6,fff:1,078930:6|tri:0f47af@0.4|star:fcdd09@0.13,0.5,0.1
ES|Spain|hw:aa151b:1,f1bf00:2,aa151b:1|shield:aa151b@0.3,0.5,0.12
LK|Sri Lanka|f:ffbe29|rect:00534e@0.04,0.08,0.13,0.84|rect:eb7400@0.17,0.08,0.13,0.84|rect:8d153a@0.33,0.08,0.63,0.84|lion:ffbe29@0.65,0.5,0.22
SD|Sudan|h:d21034,fff,000|tri:007229@0.35
SR|Suriname|hw:377e3f:2,fff:1,b40a2d:4,fff:1,377e3f:2|star:ecc81d@0.5,0.5,0.15
SE|Sweden|f:006aa7|nordic:fecc00
CH|Switzerland|f:d52b1e|swiss:fff
SY|Syria|h:ce1126,fff,000|star:007a3d@0.38,0.5,0.08|star:007a3d@0.62,0.5,0.08
TW|Taiwan|f:fe0000|rect:000095@0,0,0.5,0.5|sun:fff@0.25,0.25,0.12
TJ|Tajikistan|hw:cc0000:2,fff:3,006600:2|crown:f8c300@0.5,0.5,0.12
TZ|Tanzania|f:1eb53a|poly:00a3dd@1,0,1,1,0,1|poly:fcd116@0,0.78,0.78,0,1,0,1,0.22,0.22,1,0,1|poly:000@0,0.88,0.88,0,1,0,1,0.12,0.12,1,0,1
TH|Thailand|hw:a51931:1,f4f5f8:1,2d2a4a:2,f4f5f8:1,a51931:1
TL|Timor-Leste|f:dc241f|tri:ffc726@0.5|tri:000@0.33|star:fff@0.12,0.5,0.08
TG|Togo|h:006a4e,ffce00,006a4e,ffce00,006a4e|rect:d21034@0,0,0.4,0.6|star:fff@0.2,0.3,0.12
TO|Tonga|f:c10000|rect:fff@0,0,0.45,0.5|rect:c10000@0.17,0.08,0.11,0.34|rect:c10000@0.07,0.19,0.31,0.12
TT|Trinidad and Tobago|f:da1a35|poly:fff@0,0,0.3,0,1,1,0.7,1|poly:000@0.06,0,0.24,0,0.94,1,0.76,1
TN|Tunisia|f:e70013|disc:fff@0.5,0.5,0.25|crescent:e70013@0.5,0.5,0.18|star:e70013@0.56,0.5,0.08
TR|Türkiye|f:e30a17|crescent:fff@0.4,0.5,0.25|star:fff@0.53,0.5,0.08
TM|Turkmenistan|f:00843d|rect:d22630@0.13,0,0.17,1|crescent:fff@0.45,0.25,0.12
TV|Tuvalu|f:5b97b1|ujack|star:ffce00@0.7,0.3,0.05|star:ffce00@0.85,0.6,0.05|star:ffce00@0.6,0.7,0.05|star:ffce00@0.9,0.2,0.05
UG|Uganda|h:000,fcdc04,d90000,000,fcdc04,d90000|disc:fff@0.5,0.5,0.18|bird:000@0.5,0.5,0.12
UA|Ukraine|h:0057b7,ffd700
AE|United Arab Emirates|h:00732f,fff,000|rect:ff0000@0,0,0.25,1
GB|United Kingdom|f:012169|ujackfull
US|United States|h:b22234,fff,b22234,fff,b22234,fff,b22234,fff,b22234,fff,b22234,fff,b22234|rect:3c3b6e@0,0,0.4,0.54|starsgrid:fff@0.4,0.54
UY|Uruguay|h:fff,0038a8,fff,0038a8,fff,0038a8,fff,0038a8,fff|rect:fff@0,0,0.4,0.56|sun:fcd116@0.2,0.28,0.13
UZ|Uzbekistan|hw:0099b5:5,ce1126:0.4,fff:5,ce1126:0.4,1eb53a:5|crescent:fff@0.15,0.18,0.1
VU|Vanuatu|h:d21034,009543|poly:fdce12@0,0,0.48,0.42,1,0.42,1,0.58,0.48,0.58,0,1|poly:000@0,0.08,0.42,0.5,0,0.92
VA|Vatican City|v:ffe000,fff|keys:c9a52c@0.75,0.5,0.18
VE|Venezuela|h:ffcc00,00247d,cf142b|starsarc:fff@8,0.5,0.6,0.22
VN|Vietnam|f:da251d|star:ffff00@0.5,0.5,0.3
YE|Yemen|h:ce1126,fff,000
ZM|Zambia|f:198a00|rect:de2010@0.7,0.4,0.1,0.6|rect:000@0.8,0.4,0.1,0.6|rect:ef7d00@0.9,0.4,0.1,0.6|bird:ef7d00@0.85,0.22,0.12
ZW|Zimbabwe|h:006400,ffd200,d40000,000,d40000,ffd200,006400|tri:fff@0.42|star:d40000@0.13,0.5,0.1
XK|Kosovo|f:244aa5|poly:d0a650@0.35,0.4,0.6,0.35,0.68,0.55,0.45,0.62|starsarc:fff@6,0.5,0.32,0.18
AW|Aruba|f:418fde|rect:fbe122@0,0.66,1,0.06|rect:fbe122@0,0.76,1,0.06|star4:ef3340@0.18,0.3,0.12
GL|Greenland|h:fff,d00c33|disc2:d00c33,fff@0.37,0.5,0.24
PR|Puerto Rico|h:ed0000,fff,ed0000,fff,ed0000|tri:0050f0@0.45|star:fff@0.15,0.5,0.1
HK|Hong Kong|f:de2910|flower:fff@0.5,0.5,0.25
`;

  F.list = [];
  F.byCode = {};
  for (const line of RAW.trim().split('\n')) {
    const [code, name, ...rest] = line.split('|');
    const spec = rest.join('|');
    const e = { code, name, spec };
    F.list.push(e); F.byCode[code] = e;
  }
  F.list.sort((a, b) => a.name.localeCompare(b.name));
  F.countryCodes = () => F.list.map((e) => e.code);

  // ---------- drawing helpers ----------
  function col(c) { return '#' + c; }
  function star(ctx, cx, cy, r, n, inner) {
    n = n || 5; inner = inner || 0.4;
    ctx.beginPath();
    for (let k = 0; k < n * 2; k++) {
      const a = -Math.PI / 2 + k * Math.PI / n;
      const rr = k % 2 ? r * inner : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function ujack(ctx, x, y, w, h) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#012169'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
    ctx.strokeStyle = '#c8102e'; ctx.lineWidth = h * 0.07;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.42, y, w * 0.16, h); ctx.fillRect(x, y + h * 0.36, w, h * 0.28);
    ctx.fillStyle = '#c8102e'; ctx.fillRect(x + w * 0.455, y, w * 0.09, h); ctx.fillRect(x, y + h * 0.4, w, h * 0.2);
    ctx.restore();
  }

  // emblem renderer: (ctx, kind, color, cx, cy, r, extra, w, h)
  function emblem(ctx, kind, c, cx, cy, r, args, x, y, w, h) {
    ctx.fillStyle = c; ctx.strokeStyle = c;
    switch (kind) {
      case 'disc': ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); break;
      case 'ring': ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, 7); ctx.stroke(); break;
      case 'star': star(ctx, cx, cy, r, 5, 0.4); break;
      case 'star4': star(ctx, cx, cy, r, 4, 0.35); break;
      case 'star6': ctx.lineWidth = r * 0.16;
        for (const o of [0, Math.PI]) { ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + o + k * 2 * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); ctx.stroke(); }
        break;
      case 'pent': ctx.lineWidth = r * 0.12; ctx.beginPath(); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.stroke(); break;
      case 'crescent': {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.arc(cx + r * 0.3, cy, r * 0.8, 0, 7, true); ctx.fill('evenodd');
        ctx.restore(); break;
      }
      case 'sun': ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, 7); ctx.fill();
        ctx.lineWidth = r * 0.12; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
        break;
      case 'rays': ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.12) * w, cy + Math.sin(a - 0.12) * w); ctx.lineTo(cx + Math.cos(a + 0.12) * w, cy + Math.sin(a + 0.12) * w); ctx.closePath(); ctx.fill(); }
        break;
      case 'leaf': ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.3, cy - r * 0.4); ctx.lineTo(cx + r, cy - r * 0.5); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx + r * 0.9, cy + r * 0.2); ctx.lineTo(cx + r * 0.1, cy + r * 0.5); ctx.lineTo(cx + r * 0.1, cy + r); ctx.lineTo(cx - r * 0.1, cy + r); ctx.lineTo(cx - r * 0.1, cy + r * 0.5); ctx.lineTo(cx - r * 0.9, cy + r * 0.2); ctx.lineTo(cx - r * 0.7, cy); ctx.lineTo(cx - r, cy - r * 0.5); ctx.lineTo(cx - r * 0.3, cy - r * 0.4); ctx.closePath(); ctx.fill(); break;
      case 'bird': ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.6); ctx.lineTo(cx + r, cy - r * 0.9); ctx.lineTo(cx + r * 0.6, cy); ctx.lineTo(cx + r * 0.3, cy + r * 0.2); ctx.lineTo(cx + r * 0.25, cy + r); ctx.lineTo(cx - r * 0.25, cy + r); ctx.lineTo(cx - r * 0.3, cy + r * 0.2); ctx.lineTo(cx - r * 0.6, cy); ctx.lineTo(cx - r, cy - r * 0.9); ctx.closePath(); ctx.fill(); break;
      case 'shield': ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy - r); ctx.lineTo(cx + r * 0.75, cy - r); ctx.lineTo(cx + r * 0.75, cy + r * 0.1); ctx.quadraticCurveTo(cx + r * 0.7, cy + r * 0.8, cx, cy + r); ctx.quadraticCurveTo(cx - r * 0.7, cy + r * 0.8, cx - r * 0.75, cy + r * 0.1); ctx.closePath(); ctx.fill(); break;
      case 'checker': for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : c; ctx.fillRect(cx - r + i * r * 0.4, cy - r + j * r * 0.4, r * 0.4, r * 0.4); } break;
      case 'gear': ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; const rr = k % 2 ? r * 0.75 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); break;
      case 'trident': ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.lineTo(cx, cy - r); ctx.moveTo(cx - r * 0.6, cy - r * 0.8); ctx.quadraticCurveTo(cx - r * 0.6, cy, cx, cy); ctx.quadraticCurveTo(cx + r * 0.6, cy, cx + r * 0.6, cy - r * 0.8); ctx.stroke(); break;
      case 'tulip': ctx.lineWidth = r * 0.15; ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0.2 * Math.PI, 0.8 * Math.PI, true); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r * 0.7); ctx.stroke(); break;
      case 'yy': { const [c1, c2] = args; ctx.fillStyle = '#' + c1; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#' + c2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#' + c1; ctx.beginPath(); ctx.arc(cx - r / 2, cy, r / 2, 0, 7); ctx.fill(); ctx.fillStyle = '#' + c2; ctx.beginPath(); ctx.arc(cx + r / 2, cy, r / 2, 0, 7); ctx.fill(); break; }
      case 'disc2': { const [c1, c2] = args; ctx.fillStyle = '#' + c1; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#' + c2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill(); break; }
      case 'trigrams': ctx.fillStyle = '#000'; for (const [dx, dy, a] of [[-1, -1, 0.6], [1, -1, -0.6], [-1, 1, -0.6], [1, 1, 0.6]]) { ctx.save(); ctx.translate(cx + dx * r * 0.75, cy + dy * r * 0.62); ctx.rotate(a); for (let k = -1; k <= 1; k++) ctx.fillRect(-r * 0.15, k * r * 0.08 - r * 0.025, r * 0.3, r * 0.05); ctx.restore(); } break;
      case 'temple': ctx.fillRect(cx - r, cy + r * 0.3, r * 2, r * 0.25); ctx.fillRect(cx - r * 0.8, cy - r * 0.1, r * 1.6, r * 0.4); for (const dx of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(cx + dx * r - r * 0.18, cy - r * 0.1); ctx.lineTo(cx + dx * r, cy - r * (dx ? 0.7 : 1)); ctx.lineTo(cx + dx * r + r * 0.18, cy - r * 0.1); ctx.fill(); } break;
      case 'hat': ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.6); ctx.lineTo(cx - r, cy + r * 0.6); ctx.closePath(); ctx.fill(); break;
      case 'crown': ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.5); ctx.lineTo(cx - r, cy - r * 0.3); ctx.lineTo(cx - r * 0.5, cy + r * 0.1); ctx.lineTo(cx, cy - r * 0.6); ctx.lineTo(cx + r * 0.5, cy + r * 0.1); ctx.lineTo(cx + r, cy - r * 0.3); ctx.lineTo(cx + r, cy + r * 0.5); ctx.closePath(); ctx.fill(); break;
      case 'soyombo': ctx.fillRect(cx - r * 0.2, cy - r * 0.3, r * 0.4, r * 1.2); ctx.beginPath(); ctx.arc(cx, cy - r * 0.55, r * 0.22, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.8); ctx.lineTo(cx, cy - r * 1.1); ctx.lineTo(cx + r * 0.2, cy - r * 0.8); ctx.fill(); break;
      case 'dragon': ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.6); ctx.bezierCurveTo(cx - r * 0.3, cy - r, cx + r * 0.3, cy + r, cx + r, cy - r * 0.6); ctx.stroke(); break;
      case 'lion': ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 0.7, r * 0.45, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.35, r * 0.35, 0, 7); ctx.fill(); break;
      case 'script': ctx.lineWidth = r * 0.08; ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(cx - r + k * r * 0.36, cy); ctx.quadraticCurveTo(cx - r * 0.8 + k * r * 0.36, cy - r * 0.4, cx - r * 0.65 + k * r * 0.36, cy); } ctx.stroke(); break;
      case 'keys': ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(cx - r, cy + r); ctx.lineTo(cx + r, cy - r); ctx.moveTo(cx + r, cy + r); ctx.lineTo(cx - r, cy - r); ctx.stroke(); break;
      case 'flower': for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.45, r * 0.22, a, 0, 7); ctx.fill(); } break;
      case 'diamond': ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.6, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.6, cy); ctx.closePath(); ctx.fill(); break;
      case 'tri3': ctx.lineWidth = r * 0.15; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.7); ctx.lineTo(cx - r, cy + r * 0.7); ctx.closePath(); ctx.stroke(); break;
      case 'nuke': MP.Icons && MP.Icons.drawGlyph(ctx, 'nuke', cx - r, cy - r, r * 2, c); break;
      case 'skull': ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.7, 0, 7); ctx.fill(); ctx.fillRect(cx - r * 0.4, cy + r * 0.3, r * 0.8, r * 0.5); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.15, r * 0.18, 0, 7); ctx.arc(cx + r * 0.28, cy - r * 0.15, r * 0.18, 0, 7); ctx.fill(); break;
      case 'bolt': MP.Icons && MP.Icons.drawGlyph(ctx, 'emp', cx - r, cy - r, r * 2, c); break;
      case 'tower': MP.Icons && MP.Icons.drawGlyph(ctx, 'fort', cx - r, cy - r, r * 2, c); break;
      case 'atom': ctx.lineWidth = r * 0.1; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.35, k * Math.PI / 3, 0, 7); ctx.stroke(); } ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, 7); ctx.fill(); break;
    }
  }

  // draw a spec into rect
  F.drawSpec = function (ctx, spec, x, y, w, h) {
    if (!spec) spec = 'f:777';
    if (spec.startsWith('cc:')) { const e = F.byCode[spec.slice(3)]; spec = e ? e.spec : 'f:777'; }
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const parts = spec.split('|');
    for (const part of parts) {
      const ci = part.indexOf(':');
      const kind = ci < 0 ? part : part.slice(0, ci);
      const rest = ci < 0 ? '' : part.slice(ci + 1);
      const [cs, ps] = rest.split('@');
      const cols = (cs || '').split(',');
      const nums = ps ? ps.split(',').map(Number) : [];
      switch (kind) {
        case 'f': ctx.fillStyle = col(cols[0]); ctx.fillRect(x, y, w, h); break;
        case 'h': case 'v': {
          const n = cols.length;
          cols.forEach((c, i) => { ctx.fillStyle = col(c); if (kind === 'h') ctx.fillRect(x, y + h * i / n, w, h / n + 1); else ctx.fillRect(x + w * i / n, y, w / n + 1, h); });
          break;
        }
        case 'hw': case 'vw': {
          const items = cols.map((s) => { const [c, wt] = s.split(':'); return [c, Number(wt)]; });
          const tot = items.reduce((a, b) => a + b[1], 0);
          let acc = 0;
          for (const [c, wt] of items) { ctx.fillStyle = col(c); if (kind === 'hw') ctx.fillRect(x, y + h * acc / tot, w, h * wt / tot + 1); else ctx.fillRect(x + w * acc / tot, y, w * wt / tot + 1, h); acc += wt; }
          break;
        }
        case 'rect': ctx.fillStyle = col(cols[0]); ctx.fillRect(x + nums[0] * w, y + nums[1] * h, nums[2] * w, nums[3] * h); break;
        case 'frame': ctx.strokeStyle = col(cols[0]); ctx.lineWidth = h * 0.08; ctx.strokeRect(x, y, w, h); break;
        case 'poly': ctx.fillStyle = col(cols[0]); ctx.beginPath(); for (let i = 0; i < nums.length; i += 2) ctx.lineTo(x + nums[i] * w, y + nums[i + 1] * h); ctx.closePath(); ctx.fill(); break;
        case 'tri': ctx.fillStyle = col(cols[0]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * nums[0], y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill(); break;
        case 'nordic': {
          const t = h * 0.2, cxp = x + w * 0.36;
          ctx.fillStyle = col(cols[0]); ctx.fillRect(cxp - t / 2, y, t, h); ctx.fillRect(x, y + h / 2 - t / 2, w, t);
          if (cols[1]) { const t2 = t * 0.5; ctx.fillStyle = col(cols[1]); ctx.fillRect(cxp - t2 / 2, y, t2, h); ctx.fillRect(x, y + h / 2 - t2 / 2, w, t2); }
          break;
        }
        case 'cross': { const t = h * 0.2; ctx.fillStyle = col(cols[0]); ctx.fillRect(x + w / 2 - t / 2, y, t, h); ctx.fillRect(x, y + h / 2 - t / 2, w, t); break; }
        case 'cross4': { ctx.fillStyle = col(cols[0]); const s = h * 0.1; for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) { ctx.fillRect(x + fx * w - s / 2, y + fy * h - s * 1.5, s, s * 3); ctx.fillRect(x + fx * w - s * 1.5, y + fy * h - s / 2, s * 3, s); } break; }
        case 'swiss': { ctx.fillStyle = col(cols[0]); const s = h * 0.6, t = h * 0.2; ctx.fillRect(x + w / 2 - t / 2, y + h / 2 - s / 2, t, s); ctx.fillRect(x + w / 2 - s / 2, y + h / 2 - t / 2, s, t); break; }
        case 'saltire': ctx.strokeStyle = col(cols[0]); ctx.lineWidth = h * 0.18; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke(); break;
        case 'ujack': ujack(ctx, x, y, w * 0.5, h * 0.5); break;
        case 'ujackfull': ujack(ctx, x, y, w, h); break;
        case 'starsgrid': {
          ctx.fillStyle = col(cols[0]);
          const gw = nums[0] * w, gh = nums[1] * h;
          for (let r = 0; r < 9; r++) { const n = r % 2 ? 5 : 6; for (let k = 0; k < n; k++) { const sx = x + gw * ((k + (r % 2 ? 1 : 0.5) ) / 6.2), sy = y + gh * ((r + 0.6) / 9.6); star(ctx, sx, sy, Math.max(0.6, gh * 0.045)); } }
          break;
        }
        case 'starsring': case 'starsarc': {
          ctx.fillStyle = col(cols[0]);
          const n = nums[0], cx = x + nums[1] * w, cy = y + nums[2] * h, rr = nums[3] * h;
          for (let k = 0; k < n; k++) {
            const a = kind === 'starsring' ? k * 2 * Math.PI / n : Math.PI + 0.3 + k * (Math.PI - 0.6) / (n - 1);
            star(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.max(0.8, h * 0.035));
          }
          break;
        }
        default: {
          // emblem kinds: kind:color@cx,cy,r  (r relative to height)
          const cx = x + (nums[0] == null ? 0.5 : nums[0]) * w, cy = y + (nums[1] == null ? 0.5 : nums[1]) * h, r = (nums[2] == null ? 0.25 : nums[2]) * h;
          emblem(ctx, kind, col(cols[0]), cx, cy, r, cols, x, y, w, h);
        }
      }
    }
    ctx.restore();
  };

  const cache = new Map();
  F.canvas = function (spec, w, h) {
    const key = spec + '|' + w + 'x' + h;
    let cv = cache.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    F.drawSpec(cv.getContext('2d'), spec, 0, 0, w, h);
    if (cache.size > 800) cache.clear();
    cache.set(key, cv);
    return cv;
  };
  F.url = function (spec, w, h) {
    const key = 'u:' + spec + '|' + w + 'x' + h;
    let u = cache.get(key);
    if (u) return u;
    u = F.canvas(spec, w || 60, h || 40).toDataURL();
    cache.set(key, u);
    return u;
  };
  F.img = (spec, cls) => `<img class="${cls || 'flag'}" src="${F.url(spec, 60, 40)}" alt="" draggable="false">`;
  F.name = function (spec) { if (spec && spec.startsWith('cc:')) { const e = F.byCode[spec.slice(3)]; return e ? e.name : ''; } return ''; };

  // ---------- custom builder ----------
  F.LAYOUTS = [
    { id: 'h3', name: 'Tricolour ─', n: 3, make: (c) => `h:${c[0]},${c[1]},${c[2]}` },
    { id: 'v3', name: 'Tricolour │', n: 3, make: (c) => `v:${c[0]},${c[1]},${c[2]}` },
    { id: 'h2', name: 'Bicolour ─', n: 2, make: (c) => `h:${c[0]},${c[1]}` },
    { id: 'v2', name: 'Bicolour │', n: 2, make: (c) => `v:${c[0]},${c[1]}` },
    { id: 'nordic', name: 'Nordic', n: 2, make: (c) => `f:${c[0]}|nordic:${c[1]}` },
    { id: 'saltire', name: 'Saltire', n: 2, make: (c) => `f:${c[0]}|saltire:${c[1]}` },
    { id: 'cross', name: 'Cross', n: 2, make: (c) => `f:${c[0]}|cross:${c[1]}` },
    { id: 'canton', name: 'Canton', n: 3, make: (c) => `h:${c[0]},${c[1]}|rect:${c[2]}@0,0,0.42,0.5` },
    { id: 'hoist', name: 'Hoist', n: 3, make: (c) => `h:${c[0]},${c[1]}|tri:${c[2]}@0.42` },
    { id: 'diag', name: 'Diagonal', n: 3, make: (c) => `f:${c[0]}|poly:${c[1]}@1,0,1,1,0,1|poly:${c[2]}@0,0.85,0.85,0,1,0,1,0.15,0.15,1,0,1` },
    { id: 'quarter', name: 'Quartered', n: 2, make: (c) => `f:${c[0]}|rect:${c[1]}@0.5,0,0.5,0.5|rect:${c[1]}@0,0.5,0.5,0.5` },
    { id: 'band', name: 'Band', n: 2, make: (c) => `hw:${c[0]}:1,${c[1]}:2,${c[0]}:1` },
    { id: 'hazard', name: 'Hazard', n: 2, make: (c) => `f:${c[0]}|poly:${c[1]}@0,0,0.2,0,0,0.4|poly:${c[1]}@0.4,0,0.6,0,0,1.2,0,0.8|poly:${c[1]}@0.8,0,1,0,0.5,1,0.3,1|poly:${c[1]}@1,0.4,1,0.8,0.9,1,0.7,1` },
    { id: 'solid', name: 'Solid', n: 1, make: (c) => `f:${c[0]}` },
  ];
  F.EMBLEMS = ['none', 'star', 'disc', 'ring', 'crescent', 'sun', 'star6', 'bird', 'leaf', 'shield', 'gear', 'nuke', 'skull', 'bolt', 'tower', 'atom', 'crown', 'diamond'];
  F.PALETTE = ['ffd21f', 'ffb000', 'e8112d', 'c40308', '8a1538', 'ffffff', 'ece6cf', '111111', '3a3524', '0d5eaf', '00247d', '3ee6ff', '009543', '1e5631', 'a6e35a', 'ff7a30', '7a3cff', '777777'];
  F.build = function (o) {
    const L = F.LAYOUTS.find((l) => l.id === o.layout) || F.LAYOUTS[0];
    let s = L.make(o.colors);
    if (o.emblem && o.emblem !== 'none') s += `|${o.emblem}:${o.emblemColor || 'ffffff'}@${o.ex == null ? 0.5 : o.ex},0.5,${o.er || 0.26}`;
    return s;
  };
  F.randomSpec = function (rng) {
    const L = F.LAYOUTS[rng.int(F.LAYOUTS.length - 1)];
    const cols = [0, 1, 2].map(() => F.PALETTE[rng.int(F.PALETTE.length)]);
    const em = rng() < 0.5 ? F.EMBLEMS[1 + rng.int(F.EMBLEMS.length - 1)] : 'none';
    return F.build({ layout: L.id, colors: cols, emblem: em, emblemColor: F.PALETTE[rng.int(F.PALETTE.length)] });
  };
})();

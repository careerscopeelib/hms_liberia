-- Seed data for SQLite (run after schema-sqlite.sql)

INSERT INTO employee (joiningDate, eid, firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo, country, state, city, residentialAddress, permanentAddress, role, qualification, specialization, status) VALUES
('2020-06-21','EMP101','neelima','arun','pawar','1975-01-07','female','neelima@gmail.com',9013456893,143590034912,'india','maharashtra','nashik','vandana apartment, nashik','vandana apartment, nashik','doctor','mbbs, md','gynacologist',1),
('2020-06-21','EMP102','arun','nanaji','pawar','1978-05-12','male','arun@gmail.com',9800274565,409285671923,'india','maharashtra','nashik','kamod nagar','kamod nagar','doctor','mbbs','none',0),
('2020-06-21','EMP103','jagannath','yadav','suryawanshi','1990-03-07','male','jagannath@gmail.com',9028823456,103758492134,'india','maharashtra','aurangabad','gajanan banglow nashik','rushika niwas','doctor','ms','surgery',1),
('2020-06-21','EMP104','riddhi','arun','pawar','1990-03-09','female','riddhi@gmail.com',9567834245,345600189345,'india','maharashtra','pune','damodar heights','damodar heights','administrator','be','computer science',1),
('2020-06-21','EMP105','neha','ravindra','kothawade','1992-02-14','female','neha@gmail.com',1234567890,920385967123,'india','maharashtra','nashik','narayani bunglow','narayani bunglow','receptionist','be','computer',1);

INSERT INTO patient (registrationDate, pid, firstName, middleName, lastName, birthdate, gender, emailID, mobileno, adharNo, country, state, city, residentialAddress, permanentAddress, bloodGroup, chronicDiseases, medicineAllergy, doctorId) VALUES
('2020-06-21','P101','ashlesha','atul','narkhede','1990-04-12','female','ashlesha@gmail.com',1989478593,901238756123,'india','maharashtra','nashik','bhabha nagar','bhabha nagar','A+','none','bluemox','EMP101'),
('2020-06-21','P102','ritu','yuvraj','mahajan','1990-05-02','female','ritu@gmail.com',9823475901,109478563215,'india','maharashtra','nashik','uttam nagar','uttam nagar','B-','diabetes','none','EMP103'),
('2020-06-21','P103','siddhi','pramod','patil','1991-05-17','female','siddhi@gmail.com',9847382091,823947610019,'india','maharashtra','nashik','happy house apartment','happy house apartment','O+','none','none','EMP102'),
('2020-06-21','P104','kusum','pawan','hiray','1973-06-28','female','kusum@gmail.com',9478301834,728001823453,'india','maharashtra','nashik','panchavati, nashik','panchavati, nashik','AB+','diabetes','none','EMP101'),
('2021-12-06','P105','anand','nitin','shirole','2000-08-10','male','anand123@gmail.com',9023710243,450123948572,'india','maharashtra','pune','bibewadi','bibewadi','AB+','none','none','EMP101');

INSERT INTO login (id, role, username, password) VALUES
('EMP101','doctor','EMP101','$2a$10$We9z/qK7DoBK5eY7kSJ3Cud2Rb6VDMGKDBSnvXzfHQnW/Ds1zKdBi'),
('EMP103','doctor','EMP103','$2a$10$RwTr3JDO1T64S.7C45J5yOQ4IlKLo8veU6NdBaqyff4FSbmarKLXC'),
('EMP104','administrator','EMP104','$2a$10$LmE4x1jf6fvb/1fOp.6I.OTH7qzx..p9yjJjOovXGnHLsAh9VC02a'),
('EMP105','receptionist','EMP105','$2a$10$uArJiQ3sFGGEWzmrJA4U/eDXBooIa0hg59PK4BADJo5iMSY1LPhoy'),
('EMP100','administrator','root123','$2a$10$6JNcQozIanvEpS01aSdFBev3sqVJJOL2np7mFz3CSQmvppeGRo6yy');

INSERT INTO idgenerate (eid, pid) VALUES (5, 5);

INSERT INTO opd (opdid, visitdate, pid, doctorid, status) VALUES
(1,'2020-06-10','P101','EMP101',0),
(7,'2020-06-21','P101','EMP101',0),
(11,'2021-12-05','P102','EMP103',1),
(13,'2021-12-05','P104','EMP101',2),
(14,'2021-12-06','P105','EMP101',0);

INSERT INTO opddetails (opdid, symptoms, diagnosis, medicinesDose, dos, donts, investigations, followupDate, fees) VALUES
(1,'#headache #bodypain','weakness','#crocin@2 #neutrolin-B@3','#drink warm water','#junk food','none','2020-06-20','200'),
(13,'# high fever #nausea #headache #weakness','viral fever','#crocin-500@2 #neutrolin-B@1','#drink warm water ','#avoid fried or cool food item','none','2021-12-16','300'),
(14,'#weakness #nausea','fever','#meftal spas@2','#rest','#cold food items','none','2021-12-23','700'),
(7,'#abdominal pain #fever #nausea','typhoid','#crocin500@2  #meftal spas@2 #ofloxine500@1','#rest #eat dal-chaval #warm water','#oily food #cold drinks','blood test','2020-06-26','500');

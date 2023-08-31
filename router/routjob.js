const express = require('express');
const passport = require('passport'); // clg(req.user) inside jobs get request that why require it nothing else;
const axios = require('axios'); //For ScrapeIN API request

const router = express.Router();


//todo #1 REQUIRE JOBS MODEL WE GIVE MODEL VARIABLE NAME IN CAPITEL LETTER FIRST(LIKE Job , Notification , JobModel )ue dont use camelCase at the time of model requiring.

const Job = require('../models/job');
const Notification = require('../models/notification');
const User = require("../models/user");

//& MIDDLEWARES

const{checkLoggedIn,checkAdmin} = require('../middlewares/index');

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

router.get('/',async (req,res) =>{
    try{
        let pageNo = 1;
        if(req.query.page) pageNo = req.query.page;
        const options = {
            page: pageNo,
            limit: 4,
          };
        const recentJobs = await Job.paginate({} ,options);
        return res.render('jobs/home',{recentJobs,page: 'Home - Hire Hub'});
    } catch (error) {
        req.flash('error', 'Something went wrong while fetching recent jobs, please try again later');
		console.log(error);
		return res.redirect('/');
    }
});

//! Fuzzy Searching

router.get('/jobs/search',async (req,res) =>{
    try {
        const name = req.query.name;
        if(!name) return res.redirect('/jobs');
        const regex = new RegExp(escapeRegex(name));
        const foundJob = await Job.find({postName: regex});
        // console.log(foundJob);
        // return res.render('jobs/search',{foundJob,page: 'Search - Hire Hub'});
        if(foundJob.length==0){
            return res.redirect('/jobs');
        }else{
            return res.render('jobs/search',{foundJob,page: 'Search - Hire Hub'})
        }
    } catch (error) {
        req.flash('error', 'Something went wrong while fetching all jobs, please try again later');
		console.log(error);
		return res.redirect('/jobs');
    }
});

//* 1 INDEX ROUTE

router.get("/jobs",async (req,res) =>{
    try {
        let pageNo = 1;
        if(req.query.page) pageNo = req.query.page;
        const options = {
            page: pageNo,
            limit: 8,
          };
        const allJobs = await Job.paginate({},options);
        return res.render('jobs/index',{allJobs,page: 'Jobs - Hire Hub'});
    } catch (error) {
        req.flash('error', 'Something went wrong while fetching all jobs, please try again later');
		console.log(error);
		return res.redirect('/');
    }
});
//* 2 NEW ROUTE
router.get("/jobs/new",checkLoggedIn,checkAdmin,(req,res) =>{
    return res.render('jobs/new',{page: 'New Job - Hire Hub'});
});
//* 3 CREATE ROUTE
router.post("/jobs",checkLoggedIn,checkAdmin,async (req,res) =>{
    try {
        const newJob = new Job(req.body.job);
        const options =  {
            method: 'GET',
            url: `https://app.scrapein.app/api/v1/google/images?q=${newJob.logo}&google_domain=google.com&gl=us&hl=en&api_key=${process.env.API_KEY}`,
            headers: {accept: 'application/json'}
          };
          await axios                     // needed await for updet newJob.logo 
            .request(options)
            .then(function (response) {
              newJob.logo = response.data.image_results[0].image; // updet newJob.logo
            })
            .catch(function (error) {
              console.error(error);
              req.flash('error', 'Something went wrong while creating a jobs logo, please try again later');
            });
        await newJob.save();
        const newNotif = new Notification({
            title:`New ${newJob.postName} oppening`,
            body:`${newJob.companyName} just posted a new job`,
            author:newJob.companyName,
            jobId:newJob._id
        });
        await newNotif.save();
        req.flash('success', 'Successfully posted a job');
        return res.redirect('/jobs');
    } catch (error) {
        req.flash('error', 'Something went wrong while creating a job, please try again later');
		console.log(error);
	    return res.redirect('/jobs');
    }
});
// router.post("/jobs", checkLoggedIn, checkAdmin, async (req, res) => {
//     try {
//         const jobData = req.body.job; // Renamed variable for clarity
//         const options = {
//             method: 'GET',
//             url: `https://app.scrapein.app/api/v1/google/images?q=${jobData.logo}&google_domain=google.com&gl=us&hl=en&api_key=${process.env.API_KEY}`,
//             headers: { accept: 'application/json' }
//         };

//         let logoImage = ''; // Initialize logo image variable

//         try {
//             const response = await axios.request(options);
//             logoImage = response.data.image_results[0].image;
//         } catch (error) {
//             console.error(error);
//             req.flash('error', 'Something went wrong while fetching the job logo');
//         }

//         const newJob = new Job({
//             ...jobData, // Spread jobData properties
//             logo: logoImage // Set the logo to the fetched image or an empty string if fetching failed
//         });

//         await newJob.save();

//         const newNotif = new Notification({
//             title: `New ${newJob.postName} opening`,
//             body: `${newJob.companyName} just posted a new job`,
//             author: newJob.companyName,
//             jobId: newJob._id
//         });
        
//         await newNotif.save();

//         req.flash('success', 'Successfully posted a job');
//         return res.redirect('/jobs');
//     } catch (error) {
//         console.error(error);
//         req.flash('error', 'Something went wrong while creating a job, please try again later');
//         return res.redirect('/jobs');
//     }
// });
//* 4 SHOW ROUTE
router.get("/jobs/:id",async (req,res) =>{
    try {
        const job = await Job.findById(req.params.id).populate('appliedUsers');
        let flag = false;
        for(let ids of job.appliedUsers){
            if(ids.equals(req.user?._id)){
                flag = true;
            }
        }
        return res.render('jobs/show',{job,flag,page: 'Job - Hire Hub'});
    } catch (error) {
        req.flash('error', 'Something went wrong while fetching a job, please try again later');
		console.log(error);
	    return res.redirect('/jobs');
    }
});
//* 5 EDIT ROUTE
router.get("/jobs/:id/edit",checkLoggedIn,checkAdmin,async (req,res) =>{
    try {
        const foundJob = await Job.findById(req.params.id);
        return res.render('jobs/edit',{foundJob,page: 'Edit Job - Hire Hub'});
    } catch (error) {
        req.flash('error', 'Something went wrong while fetching a job, please try again later');
		console.log(error);
		return res.redirect('/jobs');
    }
});
//* 6 UPDATE ROUTE
router.patch("/jobs/:id",checkLoggedIn,checkAdmin,async (req,res)=>{
    try {
        const jobData = req.body.job;
        // const options =  {
        //     method: 'GET',
        //     url: `https://app.scrapein.app/api/v1/google/images?q=${jobData.logo}&google_domain=google.com&gl=us&hl=en&api_key=${process.env.API_KEY}`,
        //     headers: {accept: 'application/json'}
        //   };
        //   await axios                     // needed await for updet nnewJob.logo
        //     .request(options)
        //     .then(function (response) {
        //       jobData.logo = response.data.image_results[0].image; // updet newJob.logo
        //     })
        //     .catch(function (error) {
        //       console.error(error);
        //       req.flash('error', 'Something went wrong while creating a jobs logo, please try again later');
        //     });
        await Job.findByIdAndUpdate(req.params.id,jobData);
        const newNotif = new Notification({
            title:`${jobData.companyName} just updet there job`,
            body:`${jobData.postName} post`,
            author:jobData.companyName,
            jobId:req.params.id
        });
        await newNotif.save();
        req.flash('success', 'Successfully updated the job');
        return res.redirect(`/jobs/${req.params.id}`);
    } catch (error) {
        req.flash('error', 'Something went wrong while updating a job, please try again later');
		console.log(error);
		return res.redirect('/jobs');
    }
});
//* 7 DELETE ROUTE
router.delete("/jobs/:id",checkLoggedIn,checkAdmin,async (req,res) =>{
    try {
        const jobData = await Job.findById(req.params.id);
        await Job.findByIdAndDelete(req.params.id);
        const newNotif = new Notification({
            title:`${jobData.companyName} just remove there job`,
            body:`${jobData.postName} post`,
            author:jobData.companyName,
        });
        await newNotif.save();
        req.flash('success', 'Successfully deleted the job');
        return res.redirect('/jobs');
    } catch (error) {
        req.flash('error', 'Something went wrong while deleting a job, please try again later');
		console.log(error);
		return res.redirect('/jobs');
    }
});

// ! changing job status
router.get('/jobs/:id/status', checkLoggedIn, checkAdmin, async (req, res) => {
	try {
		const  type  = req.query.status,
			{ id } = req.params;
		if (!type) return res.redirect(`/jobs/${id}`);
	    await Job.findByIdAndUpdate(id, { status: type });
		req.flash('success', 'status is successfully changed');
		return res.redirect(`/jobs/${id}`);
	} catch (error) {
		req.flash('error', 'Something went wrong while changing status of a job, please try again later');
		console.log(error);
		return res.redirect('/jobs');
	}
});
//! applying to a job
router.get('/jobs/:id/apply/:userId',checkLoggedIn,async(req,res) =>{
    try {
        const { id, userId } = req.params;
		const job = await Job.findById(id);
		const user = await User.findById(userId);
        if(user.CGPA<job.CGPA){
            req.flash('error', 'Your CGPA dose not meet the criteria');
            return res.redirect(`/jobs/${req.params.id}`);
        }
        for(let ids of job.appliedUsers){
            if(ids.equals(user._id)){
                req.flash('error', 'you can only apply ones');
		        return res.redirect(`/jobs/${req.params.id}`);
            }
        }
        job.appliedUsers.push(user);
		await job.save();
        user.appliedJobs.push(job);
        await user.save();
        req.flash("success", "successfully applyed");
        return res.redirect(`/jobs/${id}`);
    } catch (error) {
        req.flash('error', 'Something went wrong while applying in a job, please try again later');
		console.log(error);
		return res.redirect(`/jobs/${req.params.id}`);
    }
});

//! apply job and without login

router.get('/jobs/:id/apply/',checkLoggedIn,(req,res)=>{
    req.flash('error', 'You need to login first');
    res.redirect('/login')
});

const hasUserApplied = (job, user) => {
    let flag = false;
    for (let ids of job.appliedUsers) {
        if (ids.equals(user._id)) {
            flag = true;
        };
    }
    return flag;
};

//! test
router.get('/jobs/:id/test',checkLoggedIn,async(req,res) =>{
    try {
        const job = await Job.findById(req.params.id).populate('questions');
        const userAndJob = await Job.findById(req.params.id).populate('appliedUsers');
        const user = req.user;
        const isApplied = hasUserApplied(userAndJob,user);
        if(!isApplied){
            req.flash('error', 'you need to apply first');
            return res.redirect(`/jobs/${job._id}`);
        }
        return res.render('jobs/test',{ job,page: 'Test - Hire Hub'});
    } catch (error) {
        console.log(error);
        return res.redirect(`/jobs/${req.params.id}`);
    }
});



router.post('/jobs/:id/test',checkLoggedIn,async(req,res)=>{
    // res.send(req.body);
    //{"Question0":"option3","Question1":"option3"}
    try {
        const job = await Job.findById(req.params.id).populate('questions');
        const questions = job.questions;
        const result = hasUserApplied(job, req.user);
		if (!result) {
			req.flash('error', 'you need to apply first');
			return res.redirect(`/jobs/${req.params.id}`);
		}
        let marks = 0;
        for(let idx in questions){
            let ques = questions[idx];
            let ans = req.body[`Question${idx}`];
            if(ques.correctAns === ans) marks++;
        }
        return res.json({marks});
    } catch (error) {
        console.log(error);
    }

    
});


module.exports = router;  //& EXPORT USE IN MAIN SERVER PAGE
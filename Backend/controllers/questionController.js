const { Question } = require("../models/question");
const { Course } = require("../models/course");
const { User } = require("../models/user");
const { Admin } = require("../models/admin");
const { createNotification } = require('../utils/notificationHelper');

// Create a new question (Users only)
const createQuestion = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, content } = req.body;
    const userId = req.userId;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    // Verify the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Verify the user has purchased the course
    const user = await User.findById(userId);
    if (!user.purchasedCourses.includes(courseId)) {
      return res.status(403).json({ error: 'You must purchase the course to ask questions.' });
    }

    const question = new Question({
      course: courseId,
      user: userId,
      title,
      content,
    });

    await question.save();

    // Notify the course instructor
    await createNotification({
      recipient: course.createdBy,
      recipientModel: 'Admin',
      sender: userId,
      senderModel: 'User',
      type: 'question_asked',
      title: `New Question in ${course.title}`,
      message: `${user.username} asked a new question: "${title}"`,
      relatedCourse: courseId,
      relatedQuestion: question._id,
      actionUrl: `/admin/courses/${courseId}/questions?questionId=${question._id}`,
      priority: 'high',
    });

    // Populate user details for response
    await question.populate('user', 'username profilePhoto');

    res.status(201).json({ message: 'Question created successfully', question });
  } catch (err) {
    console.error('--- ERROR in createQuestion ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all questions for a course
const getCourseQuestions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const questions = await Question.find({ course: courseId })
      .populate('user', 'username profilePhoto')
      .populate('answers.user', 'username profilePhoto')
      .populate('answers.admin', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalQuestions = await Question.countDocuments({ course: courseId });

    res.status(200).json({
      questions,
      totalPages: Math.ceil(totalQuestions / limit),
      currentPage: page,
      totalQuestions,
    });
  } catch (err) {
    console.error('--- ERROR in getCourseQuestions ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Add an answer to a question (Users and Admins)
const addAnswer = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { content } = req.body;
    const userId = req.userId;
    const userEmail = req.userEmail;

    if (!content) {
      return res.status(400).json({ error: 'Answer content is required.' });
    }

    const question = await Question.findById(questionId).populate('course');
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    // Check if user is admin or has purchased the course
    const admin = await Admin.findOne({ email: userEmail });
    let isInstructorAnswer = false;
    let answerData = { content };

    if (admin) {
      // Admin is answering
      if (question.course.createdBy.toString() !== admin._id.toString()) {
        return res.status(403).json({ error: 'Only the course instructor can answer questions.' });
      }
      answerData.admin = admin._id;
      isInstructorAnswer = true;
    } else {
      // User is answering
      const user = await User.findById(userId);
      if (!user.purchasedCourses.includes(question.course._id)) {
        return res.status(403).json({ error: 'You must purchase the course to answer questions.' });
      }
      answerData.user = userId;
    }

    answerData.isInstructorAnswer = isInstructorAnswer;

    question.answers.push(answerData);
    await question.save();

    // Notify the original question author that their question has been answered
    const questionAuthorId = question.user.toString();
    const answererId = admin ? admin._id.toString() : userId;

    if (questionAuthorId !== answererId) {
      const answerer = admin || await User.findById(userId);
      const senderName = admin ? answerer.name : answerer.username;

      await createNotification({
        recipient: question.user,
        recipientModel: 'User',
        sender: answererId,
        senderModel: admin ? 'Admin' : 'User',
        type: 'question_answered',
        title: `Your question has a new answer`,
        message: `${senderName} replied to your question in the course "${question.course.title}".`,
        relatedCourse: question.course._id,
        relatedQuestion: question._id,
        actionUrl: `/courses/${question.course._id}/questions?questionId=${question._id}`,
        priority: 'high',
      });
    }

    // Populate the new answer for response
    await question.populate('answers.user', 'username profilePhoto');
    await question.populate('answers.admin', 'name profilePhoto');

    const newAnswer = question.answers[question.answers.length - 1];

    res.status(201).json({ message: 'Answer added successfully', answer: newAnswer });
  } catch (err) {
    console.error('--- ERROR in addAnswer ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Mark a question as resolved (Question author or course instructor only)
const markQuestionResolved = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.userId;
    const userEmail = req.userEmail;

    const question = await Question.findById(questionId).populate('course');
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    // Check if user is the question author or course instructor
    const admin = await Admin.findOne({ email: userEmail });
    const isQuestionAuthor = question.user.toString() === userId;
    const isInstructor = admin && question.course.createdBy.toString() === admin._id.toString();

    if (!isQuestionAuthor && !isInstructor) {
      return res.status(403).json({ error: 'Only the question author or course instructor can mark as resolved.' });
    }

    question.isResolved = true;
    await question.save();

    res.status(200).json({ message: 'Question marked as resolved', question });
  } catch (err) {
    console.error('--- ERROR in markQuestionResolved ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a question (Question author or course instructor only)
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.userId;
    const userEmail = req.userEmail;

    const question = await Question.findById(questionId).populate('course');
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    // Check if user is the question author or course instructor
    const admin = await Admin.findOne({ email: userEmail });
    const isQuestionAuthor = question.user.toString() === userId;
    const isInstructor = admin && question.course.createdBy.toString() === admin._id.toString();

    if (!isQuestionAuthor && !isInstructor) {
      return res.status(403).json({ error: 'Only the question author or course instructor can delete this question.' });
    }

    await Question.findByIdAndDelete(questionId);

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('--- ERROR in deleteQuestion ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createQuestion,
  getCourseQuestions,
  addAnswer,
  markQuestionResolved,
  deleteQuestion,
};
